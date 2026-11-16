import type { Participacao } from '../../api/acompanhamento';
import type { Estudo } from '../../api/estudos';
import { formatarData } from '../estudos/formatacao';

// <-------------------AGENDAMENTO DE VISITAS (RF12)------------------->
// O backend compara o dia da visita no fuso America/Recife (PR #41). Recife não tem horário de verão
// desde 2019, então o deslocamento é sempre UTC-03:00: a data e a hora digitadas são horário de Recife
const FUSO_ESTUDOS = 'America/Recife';
const DESLOCAMENTO_RECIFE = '-03:00';

// en-CA formata como AAAA-MM-DD, o mesmo formato das datas do estudo e do campo de data
const DIA_RECIFE = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_ESTUDOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const HORA_RECIFE = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_ESTUDOS,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Dia (AAAA-MM-DD) de um instante no fuso de Recife. */
export function diaRecife(instante: string | Date): string {
  return DIA_RECIFE.format(typeof instante === 'string' ? new Date(instante) : instante);
}

/** Dia de hoje (AAAA-MM-DD) no fuso de Recife. */
export function hojeRecife(agora: Date = new Date()): string {
  return diaRecife(agora);
}

/** Converte a data (AAAA-MM-DD) e a hora (HH:MM) de Recife no Instant UTC que o backend recebe. */
export function paraInstant(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00${DESLOCAMENTO_RECIFE}`).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Separa um Instant em data e hora de Recife, para preencher o formulário de reagendamento. */
export function paraCamposLocais(instante: string): { data: string; hora: string } {
  const data = new Date(instante);
  return { data: diaRecife(data), hora: HORA_RECIFE.format(data) };
}

/** Limites do campo de data: o maior entre hoje e o início do estudo, até o fim do estudo. */
export function limitesData(estudo: Pick<Estudo, 'dataInicio' | 'dataFim'>, hoje: string): { min: string; max: string } {
  return { min: hoje > estudo.dataInicio ? hoje : estudo.dataInicio, max: estudo.dataFim };
}

/** Só se agenda com o estudo em Recrutamento ou Execução e a participação ativa (RF12). */
export function estadoPermiteAgendamento(estudo: Pick<Estudo, 'estado'>): boolean {
  return estudo.estado === 'RECRUTAMENTO' || estudo.estado === 'EXECUCAO';
}

export function podeAgendar(estudo: Pick<Estudo, 'estado'>, participacao: Pick<Participacao, 'situacao'>): boolean {
  return estadoPermiteAgendamento(estudo) && participacao.situacao === 'ATIVA';
}

/** Explica por que o agendamento não está disponível; undefined quando está. */
export function motivoSemAgendamento(
  estudo: Pick<Estudo, 'estado'>,
  participacao: Pick<Participacao, 'situacao'>,
): string | undefined {
  if (participacao.situacao === 'RETIRADA') {
    return 'O participante foi retirado do estudo: não é possível agendar nem reagendar visitas.';
  }
  if (!estadoPermiteAgendamento(estudo)) {
    return 'O agendamento de visitas só fica disponível com o estudo em Recrutamento ou Execução.';
  }
  return undefined;
}

// <-------------------VALIDAÇÃO DO FORMULÁRIO------------------->
export type ValoresAgendamento = {
  /** Vazio enquanto nenhuma visita prevista foi escolhida. */
  visitaPrevistaId: string;
  data: string;
  hora: string;
};

export type ErrosAgendamento = Partial<Record<keyof ValoresAgendamento, string>>;

/**
 * Mesmas regras de data do backend, para avisar antes de enviar: o dia, em Recife, não pode ser anterior
 * a hoje e precisa estar no período do estudo. A hora não é comparada, como no backend.
 * Com exigirVisita falso (reagendamento), a visita prevista não é conferida.
 */
export function validarAgendamento(
  valores: ValoresAgendamento,
  estudo: Pick<Estudo, 'dataInicio' | 'dataFim'>,
  hoje: string,
  exigirVisita = true,
): ErrosAgendamento {
  const erros: ErrosAgendamento = {};
  if (exigirVisita && !valores.visitaPrevistaId) erros.visitaPrevistaId = 'Selecione a visita prevista.';
  if (!valores.hora) erros.hora = 'Informe a hora da visita.';
  if (!valores.data) {
    erros.data = 'Informe a data da visita.';
  } else if (valores.data < hoje) {
    erros.data = 'A data da visita não pode ser anterior a hoje.';
  } else if (valores.data < estudo.dataInicio || valores.data > estudo.dataFim) {
    erros.data = `A data da visita deve estar dentro do período do estudo (${formatarData(estudo.dataInicio)} a ${formatarData(estudo.dataFim)}).`;
  }
  return erros;
}
