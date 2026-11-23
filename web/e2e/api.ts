import { request, type APIRequestContext } from '@playwright/test';

// <-------------------PREPARAÇÃO DOS DADOS PELA API------------------->
// Segue o mesmo fluxo da coleção Postman (pastas 2, 4, 6 e 7): cria contas, um estudo
// com protocolo, abre o recrutamento e inclui um participante. Todos os dados são fictícios.
// As chamadas passam pelo proxy do Vite (/api), a mesma origem usada pelo navegador.

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.test';
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? 'Admin@12345';

export const SENHA_COORDENADOR = 'Coord@12345';
const SENHA_PESQUISADOR = 'Pesq@12345';
const SENHA_PARTICIPANTE = 'Part@12345';

export type Cenario = {
  estudoId: number;
  coordenadorEmail: string;
  coordenadorSenha: string;
  participanteNome: string;
  visitaPrevista: string;
};

/** Data de hoje no fuso de Recife (UTC-3), mais o deslocamento em dias, no formato AAAA-MM-DD. */
export function dataRecife(deslocamentoDias = 0): string {
  const base = Date.now() - 3 * 3600 * 1000 + deslocamentoDias * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

class Sessao {
  private constructor(private readonly contexto: APIRequestContext) {}

  static async nova(email: string, senha: string): Promise<Sessao> {
    const sessao = new Sessao(await request.newContext({ baseURL: BASE_URL }));
    await sessao.chamar('POST', '/auth/login', { email, senha });
    return sessao;
  }

  /** Busca um token CSRF novo antes de cada chamada, como faz a coleção Postman. */
  async chamar<T = { id: number }>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const csrf = await this.contexto.get('/api/auth/csrf');
    const { token } = (await csrf.json()) as { token: string };
    const resposta = await this.contexto.fetch(`/api${caminho}`, {
      method: metodo,
      data: corpo,
      headers: { 'X-CSRF-TOKEN': token },
    });
    if (!resposta.ok()) {
      throw new Error(`${metodo} ${caminho} respondeu ${resposta.status()}: ${await resposta.text()}`);
    }
    return (resposta.status() === 204 ? undefined : await resposta.json()) as T;
  }

  async encerrar(): Promise<void> {
    await this.contexto.dispose();
  }
}

/** Cria o estudo em recrutamento com um participante incluído e devolve o que os testes precisam. */
export async function prepararCenario(): Promise<Cenario> {
  const sufixo = Date.now();
  const emails = {
    pesquisador: `pesquisador.e2e.${sufixo}@example.test`,
    coordenador: `coordenador.e2e.${sufixo}@example.test`,
    participante: `participante.e2e.${sufixo}@example.test`,
  };
  const participanteNome = 'Participante E2E';
  const visitaPrevista = 'Visita inicial';

  // Contas (administrador)
  const admin = await Sessao.nova(ADMIN_EMAIL, ADMIN_SENHA);
  await admin.chamar('POST', '/usuarios', {
    nome: 'Pesquisador E2E', email: emails.pesquisador, senha: SENHA_PESQUISADOR, perfil: 'PESQUISADOR',
  });
  const coordenador = await admin.chamar('POST', '/usuarios', {
    nome: 'Coordenador E2E', email: emails.coordenador, senha: SENHA_COORDENADOR, perfil: 'COORDENADOR',
  });
  const participante = await admin.chamar('POST', '/usuarios', {
    nome: participanteNome, email: emails.participante, senha: SENHA_PARTICIPANTE, perfil: 'PARTICIPANTE',
  });
  await admin.encerrar();

  // Estudo e protocolo (pesquisador). O período começa hoje: a API só agenda de hoje em diante.
  const pesq = await Sessao.nova(emails.pesquisador, SENHA_PESQUISADOR);
  const estudo = await pesq.chamar('POST', '/estudos', {
    titulo: `Estudo E2E ${sufixo}`,
    objetivo: 'Percorrer o agendamento e o registro de visitas com dados fictícios.',
    dataInicio: dataRecife(0),
    dataFim: dataRecife(180),
    limiteParticipantes: 5,
    coordenadorId: coordenador.id,
  });
  const criterio = await pesq.chamar('POST', `/estudos/${estudo.id}/criterios`, {
    tipo: 'INCLUSAO', descricao: 'Ter idade igual ou superior a 18 anos.',
  });
  await pesq.chamar('PUT', `/estudos/${estudo.id}/criterios/exclusao`, { semCriteriosExclusao: true });
  const visita = await pesq.chamar('POST', `/estudos/${estudo.id}/visitas`, {
    nome: visitaPrevista, descricao: 'Avaliação inicial do participante.', ordem: 1,
  });
  await pesq.chamar('POST', `/estudos/${estudo.id}/visitas/${visita.id}/atividades`, {
    descricao: 'Realizar aferição da pressão arterial.',
  });
  await pesq.chamar('PATCH', `/estudos/${estudo.id}/estado`, { estado: 'RECRUTAMENTO' });
  await pesq.encerrar();

  // Candidato, elegibilidade, consentimento e inclusão (coordenador)
  const coord = await Sessao.nova(emails.coordenador, SENHA_COORDENADOR);
  const candidato = await coord.chamar('POST', `/estudos/${estudo.id}/candidatos`, {
    nome: participanteNome, email: emails.participante,
  });
  await coord.chamar('PUT', `/estudos/${estudo.id}/candidatos/${candidato.id}/elegibilidade`, {
    respostas: [{ criterioId: criterio.id, resposta: 'ATENDIDO' }],
  });
  await coord.chamar('PUT', `/estudos/${estudo.id}/candidatos/${candidato.id}/consentimento`, {
    resposta: 'ACEITOU', observacao: 'Aceite fictício registrado pelo E2E.',
  });
  await coord.chamar('POST', `/estudos/${estudo.id}/candidatos/${candidato.id}/inclusao`, {
    contaId: participante.id,
  });
  await coord.encerrar();

  return {
    estudoId: estudo.id,
    coordenadorEmail: emails.coordenador,
    coordenadorSenha: SENHA_COORDENADOR,
    participanteNome,
    visitaPrevista,
  };
}
