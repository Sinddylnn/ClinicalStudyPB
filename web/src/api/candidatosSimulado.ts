import type {
  AvaliacaoElegibilidade,
  AvaliacaoEntrada,
  Candidato,
  CandidatoCadastroEntrada,
  ConsentimentoEntrada,
  ContaParticipante,
  InclusaoEntrada,
  ItemAvaliacao,
  RegistroConsentimento,
  RespostaCriterio,
  ServicoCandidatos,
} from './candidatos';
import { ErroRequisicao } from './erros';
import { servicoEstudos, type ServicoEstudos } from './estudos';
import { servicoEstudosSimulado } from './estudosSimulado';
import { servicoProtocolo, type ServicoProtocolo } from './protocolo';
import { calcularElegibilidade, respostaValida } from '../pages/recrutamento/elegibilidade';
import { mesmoEmail } from '../pages/recrutamento/inclusao';
import { validarCandidato, validarConsentimento } from '../pages/recrutamento/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os candidatos, as avaliações e os consentimentos em memória e responde como o backend
// deve responder: 404 para estudo fora da lista da sessão ou candidato de outro estudo,
// 400 para campos inválidos, estudo fora de Recrutamento ou alteração depois da inclusão
// (regras de negócio) e 409 para e-mail repetido, inclusão duplicada ou limite atingido (conflito).
// Os critérios da avaliação vêm do protocolo do estudo (serviço de protocolo em uso).
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ATRASO_MS = 300;

// Estudo "Acompanhamento de hábitos" dos estudos simulados, com os mesmos candidatos do protótipo
const ESTUDO_RECRUTAMENTO = 3;

export const CANDIDATOS_INICIAIS: Candidato[] = [
  {
    id: 1,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Maria Souza',
    email: 'maria.souza@exemplo.com',
    elegibilidade: 'ELEGIVEL',
    consentimento: 'ACEITOU',
    dataInclusao: '2026-10-28',
  },
  {
    id: 2,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Bruno Martins',
    email: 'bruno.martins@exemplo.com',
    elegibilidade: 'ELEGIVEL',
    consentimento: 'ACEITOU',
    dataInclusao: null,
  },
  {
    id: 3,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Camila Ferreira',
    email: 'camila.ferreira@exemplo.com',
    elegibilidade: 'ELEGIVEL',
    consentimento: 'RECUSOU',
    dataInclusao: null,
  },
  {
    id: 4,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Diego Alves',
    email: 'diego.alves@exemplo.com',
    elegibilidade: 'INELEGIVEL',
    consentimento: 'PENDENTE',
    dataInclusao: null,
  },
  {
    id: 5,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Eduarda Lima',
    email: 'eduarda.lima@exemplo.com',
    elegibilidade: 'INCOMPLETA',
    consentimento: 'PENDENTE',
    dataInclusao: null,
  },
  {
    id: 6,
    estudoId: ESTUDO_RECRUTAMENTO,
    nome: 'Felipe Souza',
    email: 'felipe.souza@exemplo.com',
    elegibilidade: 'NAO_AVALIADO',
    consentimento: 'PENDENTE',
    dataInclusao: null,
  },
];

/** Avaliação como fica guardada: a resposta de cada critério e quem salvou por último. */
export type AvaliacaoSimulada = {
  candidatoId: number;
  respostas: Record<number, RespostaCriterio | null>;
  avaliadoPor: string;
  avaliadoEm: string;
};

// Critérios 3 (inclusão) e 4 (exclusão) do protocolo simulado do estudo 3, coerentes com a
// situação de cada candidato acima; Felipe ainda não foi avaliado
export const AVALIACOES_INICIAIS: AvaliacaoSimulada[] = [
  { candidatoId: 1, respostas: { 3: 'ATENDIDO', 4: 'AUSENTE' }, avaliadoPor: 'Carlos Coordenador', avaliadoEm: '2026-10-27T09:10:00' },
  { candidatoId: 2, respostas: { 3: 'ATENDIDO', 4: 'AUSENTE' }, avaliadoPor: 'Carlos Coordenador', avaliadoEm: '2026-10-27T09:40:00' },
  { candidatoId: 3, respostas: { 3: 'ATENDIDO', 4: 'AUSENTE' }, avaliadoPor: 'Carlos Coordenador', avaliadoEm: '2026-10-27T10:15:00' },
  { candidatoId: 4, respostas: { 3: 'ATENDIDO', 4: 'PRESENTE' }, avaliadoPor: 'Carlos Coordenador', avaliadoEm: '2026-10-27T11:20:00' },
  { candidatoId: 5, respostas: { 3: 'ATENDIDO', 4: null }, avaliadoPor: 'Carlos Coordenador', avaliadoEm: '2026-10-27T14:32:00' },
];

/** Consentimento como fica guardado; a resposta em si fica no candidato. */
export type ConsentimentoSimulado = {
  candidatoId: number;
  observacao: string | null;
  registradoPor: string;
  registradoEm: string;
};

export const CONSENTIMENTOS_INICIAIS: ConsentimentoSimulado[] = [
  { candidatoId: 1, observacao: null, registradoPor: 'Carlos Coordenador', registradoEm: '2026-10-27T09:30:00' },
  { candidatoId: 2, observacao: null, registradoPor: 'Carlos Coordenador', registradoEm: '2026-10-27T14:40:00' },
  {
    candidatoId: 3,
    observacao: 'Candidata preferiu não participar.',
    registradoPor: 'Carlos Coordenador',
    registradoEm: '2026-10-27T15:02:00',
  },
];

// Contas ativas de participante. "Bruno M." existe para mostrar o bloqueio de e-mail diferente
export const CONTAS_INICIAIS: ContaParticipante[] = [
  { id: 11, nome: 'Bruno M.', email: 'bruno.m@exemplo.com' },
  { id: 12, nome: 'Bruno Martins', email: 'bruno.martins@exemplo.com' },
  { id: 13, nome: 'Camila Ferreira', email: 'camila.ferreira@exemplo.com' },
  { id: 14, nome: 'Maria Souza', email: 'maria.souza@exemplo.com' },
];

// Sem a sessão no simulado, o salvamento fica em nome do coordenador do protótipo
const AVALIADOR_SIMULADO = 'Carlos Coordenador';

/** Data e hora local no formato ISO, sem fuso (como o LocalDateTime do backend). */
function agoraIso(): string {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return (
    `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}` +
    `T${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}:${doisDigitos(agora.getSeconds())}`
  );
}

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

// O e-mail é comparado sem diferença de maiúsculas, como o cadastro de usuários
const normalizarEmail = (email: string) => email.trim().toLowerCase();

/**
 * Cria o serviço sobre a mesma fonte de estudos que as telas usam: assim o
 * "não encontrado" e o estado do estudo seguem o serviço de estudos em uso.
 */
export function criarServicoCandidatosSimulado(
  estudos: ServicoEstudos,
  iniciais: Candidato[],
  protocolo: ServicoProtocolo = servicoProtocolo,
  avaliacoesIniciais: AvaliacaoSimulada[] = [],
  consentimentosIniciais: ConsentimentoSimulado[] = [],
  contas: ContaParticipante[] = [],
): ServicoCandidatos {
  let candidatos = [...iniciais];
  let avaliacoes = avaliacoesIniciais.map((a) => ({ ...a, respostas: { ...a.respostas } }));
  let consentimentos = [...consentimentosIniciais];

  async function buscarEstudo(estudoId: number) {
    const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
    if (!estudo) {
      throw new ErroRequisicao(404, {
        codigo: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Estudo não encontrado.',
      });
    }
    return estudo;
  }

  async function buscarCandidato(estudoId: number, candidatoId: number) {
    const estudo = await buscarEstudo(estudoId);
    const candidato = candidatos.find((c) => c.estudoId === estudoId && c.id === candidatoId);
    if (!candidato) {
      throw new ErroRequisicao(404, {
        codigo: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Candidato não encontrado.',
      });
    }
    return { estudo, candidato };
  }

  // Monta a resposta com os critérios atuais do protocolo do estudo (RF05)
  async function avaliacaoDe(candidato: Candidato): Promise<AvaliacaoElegibilidade> {
    const { criteriosInclusao, criteriosExclusao } = await protocolo.obter(candidato.estudoId);
    const salva = avaliacoes.find((a) => a.candidatoId === candidato.id);
    const itens: ItemAvaliacao[] = [
      ...criteriosInclusao.map((c) => ({ criterioId: c.id, tipo: 'INCLUSAO' as const, descricao: c.descricao })),
      ...criteriosExclusao.map((c) => ({ criterioId: c.id, tipo: 'EXCLUSAO' as const, descricao: c.descricao })),
    ].map((item) => ({ ...item, resposta: salva?.respostas[item.criterioId] ?? null }));
    return {
      candidato: { ...candidato },
      situacao: candidato.elegibilidade,
      itens,
      avaliadoPor: salva?.avaliadoPor ?? null,
      avaliadoEm: salva?.avaliadoEm ?? null,
    };
  }

  function consentimentoDe(candidato: Candidato): RegistroConsentimento {
    const salvo = consentimentos.find((c) => c.candidatoId === candidato.id);
    return {
      candidato: { ...candidato },
      observacao: salvo?.observacao ?? null,
      registradoPor: salvo?.registradoPor ?? null,
      registradoEm: salvo?.registradoEm ?? null,
    };
  }

  const incluidosNo = (estudoId: number) =>
    candidatos.filter((c) => c.estudoId === estudoId && c.dataInclusao).length;

  return {
    async listar(estudoId) {
      await buscarEstudo(estudoId);
      await aguardar();
      return candidatos.filter((c) => c.estudoId === estudoId);
    },

    async cadastrar(estudoId, entrada: CandidatoCadastroEntrada) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();

      // Mesma ordem do backend: primeiro os campos (@Valid), depois as regras do estudo
      const errosCampos = validarCandidato(entrada);
      if (Object.keys(errosCampos).length > 0) {
        throw new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos,
        });
      }
      if (estudo.estado !== 'RECRUTAMENTO') {
        throw new ErroRequisicao(400, {
          codigo: 'ESTADO_INVALIDO',
          mensagem: 'Só é possível cadastrar candidatos em estudos em Recrutamento.',
        });
      }
      const email = normalizarEmail(entrada.email);
      if (candidatos.some((c) => c.estudoId === estudoId && normalizarEmail(c.email) === email)) {
        throw new ErroRequisicao(409, {
          codigo: 'EMAIL_JA_CADASTRADO',
          mensagem: 'Já existe um candidato com este e-mail neste estudo.',
        });
      }

      const novo: Candidato = {
        id: Math.max(0, ...candidatos.map((c) => c.id)) + 1,
        estudoId,
        nome: entrada.nome.trim(),
        email,
        elegibilidade: 'NAO_AVALIADO',
        consentimento: 'PENDENTE',
        dataInclusao: null,
      };
      candidatos = [...candidatos, novo];
      return novo;
    },

    async obterElegibilidade(estudoId, candidatoId) {
      const { candidato } = await buscarCandidato(estudoId, candidatoId);
      await aguardar();
      return avaliacaoDe(candidato);
    },

    async avaliarElegibilidade(estudoId, candidatoId, entrada: AvaliacaoEntrada) {
      const { estudo, candidato } = await buscarCandidato(estudoId, candidatoId);
      const atual = await avaliacaoDe(candidato);
      await aguardar();

      // Campos primeiro: cada resposta precisa ser de um critério deste protocolo e do tipo certo
      const respostas: Record<number, RespostaCriterio | null> = {};
      for (const { criterioId, resposta } of entrada.respostas) {
        const item = atual.itens.find((i) => i.criterioId === criterioId);
        if (!item || !respostaValida(item.tipo, resposta)) {
          throw new ErroRequisicao(400, {
            codigo: 'VALIDACAO_INVALIDA',
            mensagem: 'Há resposta para um critério que não é deste protocolo.',
          });
        }
        respostas[criterioId] = resposta;
      }
      const itens = atual.itens.map((i) => ({ ...i, resposta: respostas[i.criterioId] ?? null }));
      const situacao = calcularElegibilidade(itens);
      if (situacao === 'NAO_AVALIADO') {
        throw new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Marque pelo menos um critério antes de salvar a avaliação.',
        });
      }

      // Depois as regras: só em Recrutamento e só antes da inclusão (a avaliação vira histórico)
      if (estudo.estado !== 'RECRUTAMENTO') {
        throw new ErroRequisicao(400, {
          codigo: 'ESTADO_INVALIDO',
          mensagem: 'Só é possível avaliar candidatos em estudos em Recrutamento.',
        });
      }
      if (candidato.dataInclusao) {
        throw new ErroRequisicao(400, {
          codigo: 'CANDIDATO_JA_INCLUIDO',
          mensagem: 'O candidato já foi incluído: a avaliação não pode mais ser corrigida.',
        });
      }

      avaliacoes = [
        ...avaliacoes.filter((a) => a.candidatoId !== candidatoId),
        { candidatoId, respostas, avaliadoPor: AVALIADOR_SIMULADO, avaliadoEm: agoraIso() },
      ];
      const avaliado = { ...candidato, elegibilidade: situacao };
      candidatos = candidatos.map((c) => (c.id === candidatoId ? avaliado : c));
      return avaliacaoDe(avaliado);
    },

    async obterConsentimento(estudoId, candidatoId) {
      const { candidato } = await buscarCandidato(estudoId, candidatoId);
      await aguardar();
      return consentimentoDe(candidato);
    },

    async registrarConsentimento(estudoId, candidatoId, entrada: ConsentimentoEntrada) {
      const { estudo, candidato } = await buscarCandidato(estudoId, candidatoId);
      await aguardar();

      const errosCampos = validarConsentimento(entrada);
      if (Object.keys(errosCampos).length > 0) {
        throw new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos,
        });
      }
      if (estudo.estado !== 'RECRUTAMENTO') {
        throw new ErroRequisicao(400, {
          codigo: 'ESTADO_INVALIDO',
          mensagem: 'Só é possível registrar o consentimento em estudos em Recrutamento.',
        });
      }
      if (candidato.dataInclusao) {
        throw new ErroRequisicao(400, {
          codigo: 'CANDIDATO_JA_INCLUIDO',
          mensagem: 'O candidato já foi incluído: o consentimento não pode mais ser corrigido.',
        });
      }
      if (candidato.elegibilidade === 'NAO_AVALIADO') {
        throw new ErroRequisicao(400, {
          codigo: 'AVALIACAO_PENDENTE',
          mensagem: 'Avalie a elegibilidade do candidato antes de registrar o consentimento.',
        });
      }

      consentimentos = [
        ...consentimentos.filter((c) => c.candidatoId !== candidatoId),
        {
          candidatoId,
          observacao: entrada.observacao?.trim() || null,
          registradoPor: AVALIADOR_SIMULADO,
          registradoEm: agoraIso(),
        },
      ];
      const registrado = { ...candidato, consentimento: entrada.resposta };
      candidatos = candidatos.map((c) => (c.id === candidatoId ? registrado : c));
      return consentimentoDe(registrado);
    },

    async obterInclusao(estudoId, candidatoId) {
      const { candidato } = await buscarCandidato(estudoId, candidatoId);
      await aguardar();
      return {
        candidato: { ...candidato },
        avaliadoEm: avaliacoes.find((a) => a.candidatoId === candidatoId)?.avaliadoEm ?? null,
        consentimentoEm: consentimentos.find((c) => c.candidatoId === candidatoId)?.registradoEm ?? null,
        incluidos: incluidosNo(estudoId),
        contas: [...contas],
      };
    },

    async incluir(estudoId, candidatoId, entrada: InclusaoEntrada) {
      const { estudo, candidato } = await buscarCandidato(estudoId, candidatoId);
      await aguardar();

      // A API confere tudo de novo, mesmo que a tela já tenha bloqueado (RF11)
      const conta = contas.find((c) => c.id === entrada.contaId);
      if (!conta) {
        throw new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { contaId: 'Escolha uma conta ativa de participante.' },
        });
      }
      if (estudo.estado !== 'RECRUTAMENTO') {
        throw new ErroRequisicao(400, {
          codigo: 'ESTADO_INVALIDO',
          mensagem: 'Só é possível incluir participantes em estudos em Recrutamento.',
        });
      }
      if (candidato.dataInclusao) {
        throw new ErroRequisicao(409, {
          codigo: 'INCLUSAO_DUPLICADA',
          mensagem: 'Esta pessoa já foi incluída neste estudo.',
        });
      }
      if (candidato.elegibilidade !== 'ELEGIVEL') {
        throw new ErroRequisicao(400, {
          codigo: 'ELEGIBILIDADE_INVALIDA',
          mensagem: 'Só é possível incluir candidatos com avaliação completa e elegível.',
        });
      }
      if (candidato.consentimento !== 'ACEITOU') {
        throw new ErroRequisicao(400, {
          codigo: 'CONSENTIMENTO_NAO_ACEITO',
          mensagem: 'Só é possível incluir candidatos que aceitaram o consentimento.',
        });
      }
      if (!mesmoEmail(conta.email, candidato.email)) {
        throw new ErroRequisicao(400, {
          codigo: 'CONTA_INVALIDA',
          mensagem: 'O e-mail desta conta é diferente do e-mail do candidato.',
        });
      }
      if (incluidosNo(estudoId) >= estudo.limiteParticipantes) {
        throw new ErroRequisicao(409, {
          codigo: 'LIMITE_ATINGIDO',
          mensagem: `Não foi possível incluir: as ${estudo.limiteParticipantes} vagas do estudo já foram preenchidas.`,
        });
      }

      const incluido = { ...candidato, dataInclusao: agoraIso().split('T')[0] };
      candidatos = candidatos.map((c) => (c.id === candidatoId ? incluido : c));
      return incluido;
    },
  };
}

// Com estudos reais, os candidatos fictícios cairiam em estudos reais de mesmo id: começa vazio
const simulados = servicoEstudos === servicoEstudosSimulado;
export const servicoCandidatosSimulado = criarServicoCandidatosSimulado(
  servicoEstudos,
  simulados ? CANDIDATOS_INICIAIS : [],
  servicoProtocolo,
  simulados ? AVALIACOES_INICIAIS : [],
  simulados ? CONSENTIMENTOS_INICIAIS : [],
  simulados ? CONTAS_INICIAIS : [],
);
