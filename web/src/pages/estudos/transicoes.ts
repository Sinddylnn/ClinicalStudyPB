import type { ErroApi } from '../../api/erros';
import type { AlteracaoEstadoEntrada, EstadoEstudo } from '../../api/estudos';
import type { PendenciaRecrutamento } from '../../api/protocolo';

// <-------------------CAMINHOS PERMITIDOS------------------->
// Mesmo EstadoEstudo.permiteTransicaoPara do backend (PR #26) e modelagem RF05-RF07, seção 6:
// sem retorno, salto, repetição do estado atual ou reabertura
export const TRANSICOES: Record<EstadoEstudo, EstadoEstudo[]> = {
  PLANEJAMENTO: ['RECRUTAMENTO', 'ENCERRADO'],
  RECRUTAMENTO: ['EXECUCAO', 'ENCERRADO'],
  EXECUCAO: ['ENCERRADO'],
  ENCERRADO: [],
};

export function permiteTransicao(origem: EstadoEstudo, destino: EstadoEstudo): boolean {
  return TRANSICOES[origem].includes(destino);
}

/** Encerrar antes da execução exige justificativa e nenhuma inclusão (seção 6). */
export function encerramentoAntecipado(origem: EstadoEstudo): boolean {
  return origem !== 'EXECUCAO';
}

// <-------------------JUSTIFICATIVA DE ENCERRAMENTO------------------->
// AlteracaoEstadoEntrada do backend: até 500 caracteres após retirar os espaços das pontas;
// texto em branco equivale a ausência
export const LIMITE_JUSTIFICATIVA = 500;

export const MENSAGEM_JUSTIFICATIVA_LONGA = 'A justificativa deve ter no máximo 500 caracteres.';
export const MENSAGEM_JUSTIFICATIVA_OBRIGATORIA = 'Informe a justificativa para encerrar o estudo antes da execução.';
export const MENSAGEM_JUSTIFICATIVA_FORA_ENCERRAMENTO =
  'A justificativa de encerramento só deve ser informada ao encerrar o estudo.';

export function normalizarJustificativa(texto: string | null | undefined): string | null {
  const aparado = texto?.trim() ?? '';
  return aparado === '' ? null : aparado;
}

/** Mensagem para o campo da tela; undefined quando a justificativa serve para a mudança. */
export function validarJustificativa(
  origem: EstadoEstudo,
  destino: EstadoEstudo,
  texto: string | null | undefined,
): string | undefined {
  const motivo = normalizarJustificativa(texto);
  if (motivo !== null && motivo.length > LIMITE_JUSTIFICATIVA) return MENSAGEM_JUSTIFICATIVA_LONGA;
  if (destino === 'ENCERRADO' && encerramentoAntecipado(origem) && motivo === null) {
    return MENSAGEM_JUSTIFICATIVA_OBRIGATORIA;
  }
  if (destino !== 'ENCERRADO' && motivo !== null) return MENSAGEM_JUSTIFICATIVA_FORA_ENCERRAMENTO;
  return undefined;
}

// <-------------------CONDIÇÕES DA TRANSIÇÃO------------------->
/** O que o backend consulta no banco antes de gravar. */
export type SituacaoTransicao = {
  /** Requisitos da seção 5 ainda não atendidos (só importa para RECRUTAMENTO). */
  pendencias: PendenciaRecrutamento[];
  /** Histórico de inclusões: uma retirada não apaga a participação. */
  possuiInclusoes: boolean;
};

// Mensagens do EstudoService.validarAberturaRecrutamento, na mesma ordem de verificação
const ERROS_PENDENCIA: Record<PendenciaRecrutamento, ErroApi> = {
  COORDENADOR: {
    codigo: 'COORDENADOR_OBRIGATORIO',
    mensagem: 'Atribua um coordenador ao estudo antes de iniciar o recrutamento.',
  },
  CRITERIO_INCLUSAO: {
    codigo: 'PROTOCOLO_INCOMPLETO',
    mensagem: 'Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.',
  },
  CRITERIOS_EXCLUSAO: {
    codigo: 'PROTOCOLO_INCOMPLETO',
    mensagem: 'Cadastre os critérios de exclusão ou confirme que não existem exclusões.',
  },
  VISITA_PREVISTA: {
    codigo: 'PROTOCOLO_INCOMPLETO',
    mensagem: 'Cadastre pelo menos uma visita prevista para iniciar o recrutamento.',
  },
};

const ORDEM_PENDENCIAS: PendenciaRecrutamento[] = [
  'COORDENADOR',
  'CRITERIO_INCLUSAO',
  'CRITERIOS_EXCLUSAO',
  'VISITA_PREVISTA',
];

/** Anotações do AlteracaoEstadoEntrada (@NotNull e @Size), conferidas antes de buscar o estudo. */
export function validarEntradaEstado(entrada: AlteracaoEstadoEntrada): ErroApi | null {
  const motivo = normalizarJustificativa(entrada.justificativaEncerramento);
  const errosCampos: Record<string, string> = {};
  if (!entrada.estado) errosCampos.estado = 'O estado é obrigatório.';
  if (motivo !== null && motivo.length > LIMITE_JUSTIFICATIVA) {
    errosCampos.justificativaEncerramento = MENSAGEM_JUSTIFICATIVA_LONGA;
  }
  if (Object.keys(errosCampos).length === 0) return null;
  return { codigo: 'VALIDACAO_INVALIDA', mensagem: 'Confira os campos informados.', errosCampos };
}

/**
 * Primeiro erro que o backend devolveria, na ordem do EstudoService.alterarEstado do PR #26:
 * campos da entrada (@Valid), caminho, condições do destino e, por fim, a justificativa
 * (Estudo.alterarEstado). Devolve null quando a mudança pode ser gravada.
 */
export function verificarTransicao(
  origem: EstadoEstudo,
  entrada: AlteracaoEstadoEntrada,
  situacao: SituacaoTransicao,
): ErroApi | null {
  const erroCampos = validarEntradaEstado(entrada);
  if (erroCampos) return erroCampos;

  const { estado: destino } = entrada;
  const motivo = normalizarJustificativa(entrada.justificativaEncerramento);

  // A mensagem do backend usa o nome do enum, sem tradução
  if (!permiteTransicao(origem, destino)) {
    return {
      codigo: 'TRANSICAO_ESTADO_INVALIDA',
      mensagem: `Não é permitido mudar de ${origem} para ${destino}.`,
    };
  }

  if (destino === 'RECRUTAMENTO') {
    const primeira = ORDEM_PENDENCIAS.find((codigo) => situacao.pendencias.includes(codigo));
    if (primeira) return { ...ERROS_PENDENCIA[primeira] };
  }
  if (destino === 'EXECUCAO' && !situacao.possuiInclusoes) {
    return {
      codigo: 'ESTUDO_SEM_PARTICIPANTES',
      mensagem: 'Inclua pelo menos um participante antes de iniciar a execução.',
    };
  }
  if (destino === 'ENCERRADO' && encerramentoAntecipado(origem) && situacao.possuiInclusoes) {
    return {
      codigo: 'ESTUDO_COM_PARTICIPANTES',
      mensagem: 'O estudo já possui inclusões e não pode ser encerrado antes da execução.',
    };
  }

  const erroJustificativa = validarJustificativa(origem, destino, motivo);
  if (erroJustificativa === MENSAGEM_JUSTIFICATIVA_OBRIGATORIA) {
    return { codigo: 'JUSTIFICATIVA_OBRIGATORIA', mensagem: erroJustificativa };
  }
  if (erroJustificativa) return { codigo: 'JUSTIFICATIVA_INVALIDA', mensagem: erroJustificativa };
  return null;
}
