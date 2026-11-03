import type { PendenciaRecrutamento, Protocolo, VisitaPrevista, VisitaPrevistaEntrada } from '../../api/protocolo';

// <-------------------VALIDAÇÃO DO CRITÉRIO------------------->
// Textos da tela; o serviço simulado usa as mensagens do backend (PR #32)
// Modelagem RF05-RF07, seção 2.2: de 1 a 1.000 caracteres após retirar espaços das pontas
export const LIMITE_DESCRICAO_CRITERIO = 1000;

export function validarCriterio(descricao: string): string | undefined {
  const texto = descricao.trim();
  if (!texto) return 'Descreva o critério.';
  if (texto.length > LIMITE_DESCRICAO_CRITERIO) {
    return `Use até ${LIMITE_DESCRICAO_CRITERIO.toLocaleString('pt-BR')} caracteres.`;
  }
  return undefined;
}

// <-------------------VALIDAÇÃO DA VISITA E DA ATIVIDADE------------------->
// Mesmas regras e mensagens de VisitaPrevistaCadastroEntrada e AtividadePrevistaCadastroEntrada
// (PR #32), usadas pela tela e pelo serviço simulado. Modelagem, seções 2.3 e 2.4
export const LIMITE_NOME_VISITA = 150;
export const LIMITE_DESCRICAO_VISITA = 1000;
export const LIMITE_DESCRICAO_ATIVIDADE = 1000;

export type ErrosVisita = Partial<Record<keyof VisitaPrevistaEntrada, string>>;

/** A ordem chega como texto do campo na tela e como número no serviço. */
export function validarVisita(entrada: { nome: string; descricao: string | null; ordem: number | string }): ErrosVisita {
  const erros: ErrosVisita = {};
  const nome = entrada.nome.trim();
  if (!nome) erros.nome = 'Informe o nome da visita.';
  else if (nome.length > LIMITE_NOME_VISITA) erros.nome = 'O nome deve ter no máximo 150 caracteres.';

  if ((entrada.descricao?.trim() ?? '').length > LIMITE_DESCRICAO_VISITA) {
    erros.descricao = 'A descrição deve ter no máximo 1000 caracteres.';
  }

  const texto = String(entrada.ordem).trim();
  const ordem = Number(texto);
  if (!texto) erros.ordem = 'Informe a ordem da visita.';
  else if (!Number.isInteger(ordem)) erros.ordem = 'Informe a ordem como um número inteiro.';
  else if (ordem <= 0) erros.ordem = 'A ordem da visita deve ser maior que zero.';
  return erros;
}

export function validarAtividade(descricao: string): string | undefined {
  const texto = descricao.trim();
  if (!texto) return 'Informe a descrição da atividade.';
  if (texto.length > LIMITE_DESCRICAO_ATIVIDADE) return 'A descrição deve ter no máximo 1000 caracteres.';
  return undefined;
}

/** Nome aparado, descrição em branco como null e ordem numérica, como o backend grava. */
export function normalizarVisita(entrada: { nome: string; descricao: string | null; ordem: number | string }) {
  const descricao = entrada.descricao?.trim() ?? '';
  return { nome: entrada.nome.trim(), descricao: descricao || null, ordem: Number(entrada.ordem) };
}

// <-------------------REQUISITOS PARA O RECRUTAMENTO------------------->
// Modelagem RF05-RF07, seção 5 (transição da T47): coordenador atribuído, ao menos 1 critério de
// inclusão, exclusões definidas ou declaradas ausentes e ao menos 1 visita prevista, com atividade em cada uma
type DadosProtocolo = Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao' | 'visitas'>;

/** Ordem das pendências conferidas pelo backend; o quadro da tela usa ORDEM_QUADRO. */
export const ORDEM_REQUISITOS: PendenciaRecrutamento[] = [
  'COORDENADOR',
  'CRITERIO_INCLUSAO',
  'CRITERIOS_EXCLUSAO',
  'VISITA_PREVISTA',
];

/** Nomes das visitas ainda sem atividade, em ordem (VisitaPrevistaRepository.buscarNomesSemAtividades). */
export function visitasSemAtividade(visitas: VisitaPrevista[]): string[] {
  return [...visitas]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((visita) => visita.atividades.length === 0)
    .map((visita) => visita.nome);
}

/** Situação de cada requisito. */
export function requisitosRecrutamento(
  protocolo: DadosProtocolo,
  coordenadorId: number | null,
): Record<PendenciaRecrutamento, boolean> {
  return {
    COORDENADOR: coordenadorId !== null,
    CRITERIO_INCLUSAO: protocolo.criteriosInclusao.length > 0,
    CRITERIOS_EXCLUSAO: protocolo.criteriosExclusao.length > 0 || protocolo.semCriteriosExclusao,
    VISITA_PREVISTA: protocolo.visitas.length > 0 && visitasSemAtividade(protocolo.visitas).length === 0,
  };
}

/** Requisitos ainda não atendidos, na ordem do backend. */
export function calcularPendencias(protocolo: DadosProtocolo, coordenadorId: number | null): PendenciaRecrutamento[] {
  const atendidos = requisitosRecrutamento(protocolo, coordenadorId);
  return ORDEM_REQUISITOS.filter((codigo) => !atendidos[codigo]);
}
