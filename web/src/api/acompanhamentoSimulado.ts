import type {
  CorrecaoVisita,
  HistoricoParticipacao,
  ItemHistoricoRetirada,
  Participacao,
  ResultadoAtividade,
  ServicoAcompanhamento,
  VisitaAgendada,
} from './acompanhamento';
import { ErroRequisicao } from './erros';
import { servicoEstudos, type ServicoEstudos } from './estudos';
import { servicoEstudosSimulado } from './estudosSimulado';
import { servicoProtocolo, type ServicoProtocolo } from './protocolo';
import { erroTextoResultado } from '../pages/acompanhamento/resultados';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda as participações, as visitas e os resultados em memória e responde como o rascunho do
// contrato: 404 para estudo fora da lista da sessão, participação de outro estudo ou visita de outra
// participação; 400 para texto inválido, visita não realizada, atividade de outra visita ou estudo
// encerrado; 409 para segundo resultado na mesma atividade. As atividades vêm do protocolo em uso.
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ATRASO_MS = 300;

// Estudo "Acompanhamento de hábitos" dos estudos simulados; Maria Souza é a candidata incluída
const ESTUDO_ACOMPANHAMENTO = 3;
const ID_COORDENADOR = 3;
const NOME_COORDENADOR = 'Carlos Coordenador';

/** Visita como fica guardada: a resposta do contrato, os resultados e as correções. */
export type VisitaSimulada = Omit<VisitaAgendada, 'participacaoId'> & {
  registradoPorNome?: string;
  resultados: ResultadoAtividade[];
  correcoes: CorrecaoVisita[];
};

/** Participação como fica guardada: o estudo dela, as visitas e a retirada, quando houver. */
export type ParticipacaoSimulada = Participacao & {
  estudoId: number;
  visitas: VisitaSimulada[];
  retirada?: ItemHistoricoRetirada;
};

// Visitas do protocolo simulado do estudo 3 (IDs 3, 4 e 5): a inicial foi realizada e tem
// resultado; a de acompanhamento teve ausência, foi remarcada e realizada sem resultados; a final
// ainda está agendada
export const PARTICIPACOES_INICIAIS: ParticipacaoSimulada[] = [
  {
    id: 1,
    estudoId: ESTUDO_ACOMPANHAMENTO,
    participanteId: 14,
    participanteNome: 'Maria Souza',
    dataInclusao: '2026-10-28T13:00:00Z',
    situacao: 'ATIVA',
    visitas: [
      {
        id: 1,
        visitaPrevistaId: 3,
        nomeVisita: 'Visita inicial',
        dataHora: '2026-10-30T12:00:00Z',
        situacao: 'REALIZADA',
        motivo: null,
        registradoPorId: ID_COORDENADOR,
        registradoPorNome: NOME_COORDENADOR,
        registradoEm: '2026-10-30T13:10:00Z',
        resultados: [
          {
            id: 1,
            visitaAgendadaId: 1,
            atividadePrevistaId: 3,
            descricaoAtividade: 'Registrar hábitos de sono, alimentação e atividade física.',
            texto: 'Dorme em média 7 horas e caminha 30 minutos por dia (dado fictício).',
            registradoPorId: ID_COORDENADOR,
            registradoEm: '2026-10-30T13:15:00Z',
            atualizadoPorId: null,
            atualizadoEm: null,
          },
        ],
        correcoes: [],
      },
      {
        id: 2,
        visitaPrevistaId: 4,
        nomeVisita: 'Visita de acompanhamento',
        dataHora: '2026-11-06T12:00:00Z',
        situacao: 'AUSENTE',
        motivo: 'Participante não compareceu.',
        registradoPorId: ID_COORDENADOR,
        registradoPorNome: NOME_COORDENADOR,
        registradoEm: '2026-11-06T15:00:00Z',
        resultados: [],
        correcoes: [],
      },
      {
        // Remarcada depois da ausência: realizada, ainda sem resultados
        id: 4,
        visitaPrevistaId: 4,
        nomeVisita: 'Visita de acompanhamento',
        dataHora: '2026-11-11T12:00:00Z',
        situacao: 'REALIZADA',
        motivo: null,
        registradoPorId: ID_COORDENADOR,
        registradoPorNome: NOME_COORDENADOR,
        registradoEm: '2026-11-11T13:00:00Z',
        resultados: [],
        correcoes: [],
      },
      {
        id: 3,
        visitaPrevistaId: 5,
        nomeVisita: 'Visita final',
        dataHora: '2026-12-10T12:00:00Z',
        situacao: 'AGENDADA',
        motivo: null,
        registradoPorId: null,
        registradoEm: null,
        resultados: [],
        correcoes: [],
      },
    ],
  },
];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

const naoEncontrado = (mensagem: string) =>
  new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem });

const recusa = (codigo: string, mensagem: string) => new ErroRequisicao(400, { codigo, mensagem });

// Cópia profunda: a tela nunca altera o que está guardado
const copiar = <T>(valor: T): T => structuredClone(valor);

/** Instant do momento, como o backend grava (UTC, sem milissegundos). */
const agoraInstant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Cria o serviço sobre as mesmas fontes de estudos e protocolo que as telas usam, como o de
 * candidatos: assim o "não encontrado", o estado do estudo e as atividades seguem o serviço em uso.
 */
export function criarServicoAcompanhamentoSimulado(
  estudos: ServicoEstudos,
  iniciais: ParticipacaoSimulada[],
  protocolo: ServicoProtocolo = servicoProtocolo,
): ServicoAcompanhamento {
  const participacoes = copiar(iniciais);
  let proximoResultado = Math.max(0, ...participacoes.flatMap((p) => p.visitas.flatMap((v) => v.resultados.map((r) => r.id)))) + 1;

  async function buscarEstudo(estudoId: number) {
    const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
    if (!estudo) throw naoEncontrado('Estudo não encontrado.');
    return estudo;
  }

  async function buscarParticipacao(estudoId: number, participacaoId: number) {
    const estudo = await buscarEstudo(estudoId);
    const participacao = participacoes.find((p) => p.estudoId === estudoId && p.id === participacaoId);
    if (!participacao) throw naoEncontrado('Participação não encontrada.');
    return { estudo, participacao };
  }

  async function buscarVisita(estudoId: number, participacaoId: number, visitaAgendadaId: number) {
    const { estudo, participacao } = await buscarParticipacao(estudoId, participacaoId);
    const visita = participacao.visitas.find((v) => v.id === visitaAgendadaId);
    if (!visita) throw naoEncontrado('Visita não encontrada.');
    return { estudo, participacao, visita };
  }

  // Mesma ordem prevista para o backend: texto (@Valid), estudo encerrado e depois a visita
  async function conferirEscrita(estudoId: number, participacaoId: number, visitaAgendadaId: number, texto: string) {
    const erroTexto = erroTextoResultado(texto);
    if (erroTexto) {
      throw new ErroRequisicao(400, {
        codigo: 'VALIDACAO_INVALIDA',
        mensagem: 'Confira os campos informados.',
        errosCampos: { texto: erroTexto },
      });
    }
    const encontrada = await buscarVisita(estudoId, participacaoId, visitaAgendadaId);
    if (encontrada.estudo.estado === 'ENCERRADO') {
      throw recusa('ESTADO_ESTUDO_INVALIDO', 'Não é permitido alterar resultados de um estudo encerrado.');
    }
    if (encontrada.visita.situacao !== 'REALIZADA') {
      throw recusa('RESULTADO_INVALIDO', 'Só é possível registrar resultados em visita realizada.');
    }
    return encontrada;
  }

  const paraVisitaAgendada = (participacaoId: number, visita: VisitaSimulada): VisitaAgendada => ({
    id: visita.id,
    participacaoId,
    visitaPrevistaId: visita.visitaPrevistaId,
    nomeVisita: visita.nomeVisita,
    dataHora: visita.dataHora,
    situacao: visita.situacao,
    motivo: visita.motivo,
    registradoPorId: visita.registradoPorId,
    registradoEm: visita.registradoEm,
  });

  return {
    async listarParticipacoes(estudoId) {
      await aguardar();
      await buscarEstudo(estudoId);
      return participacoes
        .filter((p) => p.estudoId === estudoId)
        .map(
          (p): Participacao => ({
            id: p.id,
            participanteId: p.participanteId,
            participanteNome: p.participanteNome,
            dataInclusao: p.dataInclusao,
            situacao: p.situacao,
            dataRetirada: p.dataRetirada ?? null,
          }),
        );
    },

    async obterHistorico(estudoId, participacaoId): Promise<HistoricoParticipacao> {
      await aguardar();
      const { participacao } = await buscarParticipacao(estudoId, participacaoId);
      const visitas = participacao.visitas.map((v) => ({
        tipo: 'VISITA' as const,
        visitaAgendadaId: v.id,
        nomeVisita: v.nomeVisita,
        dataHora: v.dataHora,
        situacao: v.situacao,
        motivo: v.motivo,
        registradoPorId: v.registradoPorId,
        registradoPorNome: v.registradoPorNome ?? null,
        registradoEm: v.registradoEm,
        resultados: v.resultados.map((r) => ({
          atividadePrevistaId: r.atividadePrevistaId,
          descricaoAtividade: r.descricaoAtividade,
          texto: r.texto,
        })),
        correcoes: copiar(v.correcoes),
      }));
      return { participacaoId, itens: [...visitas, ...(participacao.retirada ? [copiar(participacao.retirada)] : [])] };
    },

    async obterVisita(estudoId, participacaoId, visitaAgendadaId) {
      await aguardar();
      const { visita } = await buscarVisita(estudoId, participacaoId, visitaAgendadaId);
      return paraVisitaAgendada(participacaoId, visita);
    },

    async listarResultados(estudoId, participacaoId, visitaAgendadaId) {
      await aguardar();
      const { visita } = await buscarVisita(estudoId, participacaoId, visitaAgendadaId);
      return copiar(visita.resultados);
    },

    async registrarResultado(estudoId, participacaoId, visitaAgendadaId, { atividadePrevistaId, texto }) {
      await aguardar();
      const { visita } = await conferirEscrita(estudoId, participacaoId, visitaAgendadaId, texto);
      const prevista = (await protocolo.obter(estudoId)).visitas.find((v) => v.id === visita.visitaPrevistaId);
      const atividade = prevista?.atividades.find((a) => a.id === atividadePrevistaId);
      if (!atividade) {
        throw recusa('RESULTADO_INVALIDO', 'A atividade não pertence à visita prevista desta visita.');
      }
      if (visita.resultados.some((r) => r.atividadePrevistaId === atividadePrevistaId)) {
        throw new ErroRequisicao(409, {
          codigo: 'RESULTADO_JA_REGISTRADO',
          mensagem: 'Já existe resultado para esta atividade nesta visita.',
        });
      }
      const resultado: ResultadoAtividade = {
        id: proximoResultado++,
        visitaAgendadaId,
        atividadePrevistaId,
        descricaoAtividade: atividade.descricao,
        texto: texto.trim(),
        registradoPorId: ID_COORDENADOR,
        registradoEm: agoraInstant(),
        atualizadoPorId: null,
        atualizadoEm: null,
      };
      visita.resultados.push(resultado);
      return copiar(resultado);
    },

    async editarResultado(estudoId, participacaoId, visitaAgendadaId, resultadoId, texto) {
      await aguardar();
      const { visita } = await conferirEscrita(estudoId, participacaoId, visitaAgendadaId, texto);
      const resultado = visita.resultados.find((r) => r.id === resultadoId);
      if (!resultado) throw naoEncontrado('Resultado não encontrado.');
      resultado.texto = texto.trim();
      resultado.atualizadoPorId = ID_COORDENADOR;
      resultado.atualizadoEm = agoraInstant();
      return copiar(resultado);
    },
  };
}

// Com estudos reais, as participações fictícias cairiam em estudos reais de mesmo id: começa vazio
const simulados = servicoEstudos === servicoEstudosSimulado;
export const servicoAcompanhamentoSimulado = criarServicoAcompanhamentoSimulado(
  servicoEstudos,
  simulados ? PARTICIPACOES_INICIAIS : [],
);
