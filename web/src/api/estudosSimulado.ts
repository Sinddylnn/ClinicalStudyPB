import { ErroRequisicao } from './erros';
import type { AlteracaoEstadoEntrada, EstadoEstudo, Estudo, EstudoCadastroEntrada, ServicoEstudos } from './estudos';
import type { Protocolo } from './protocolo';
import { MENSAGEM_PERIODO_INVALIDO, validarEstudo } from '../pages/estudos/validacao';
import {
  encerramentoAntecipado,
  normalizarJustificativa,
  permiteTransicao,
  validarEntradaEstado,
  verificarTransicao,
  type SituacaoTransicao,
} from '../pages/estudos/transicoes';
import { calcularPendencias, visitasSemAtividade } from '../pages/protocolo/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os estudos em memória e responde como o backend: mesmos campos,
// mesmos códigos de erro e o estudo novo sempre em PLANEJAMENTO. A mudança de estado segue
// as regras e a ordem de verificação do PR #26 (pages/estudos/transicoes.ts).
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ID_PESQUISADORA_SIMULADA = 2;
const NOME_PESQUISADORA_SIMULADA = 'Paula Pesquisadora';
const ID_COORDENADOR_SIMULADO = 3;
const ATRASO_MS = 300;

const ESTUDOS_INICIAIS: Estudo[] = [
  // Mesmos exemplos da tela "Meus estudos" do protótipo
  {
    id: 1,
    titulo: 'Sono e rotina de estudantes',
    objetivo: 'Avaliar a relação entre horários de sono e rotina acadêmica.',
    dataInicio: '2026-11-03',
    dataFim: '2027-02-28',
    limiteParticipantes: 45,
    estado: 'PLANEJAMENTO',
    responsavelId: ID_PESQUISADORA_SIMULADA,
    responsavelNome: NOME_PESQUISADORA_SIMULADA,
    coordenadorId: ID_COORDENADOR_SIMULADO,
  },
  {
    id: 2,
    titulo: 'Hidratação em idosos',
    objetivo: 'Acompanhar a ingestão diária de água em pessoas acima de 65 anos.',
    dataInicio: '2026-12-01',
    dataFim: '2027-04-30',
    limiteParticipantes: 20,
    estado: 'PLANEJAMENTO',
    responsavelId: ID_PESQUISADORA_SIMULADA,
    responsavelNome: NOME_PESQUISADORA_SIMULADA,
    // Sem coordenador: a atribuição é opcional enquanto o estudo está em planejamento
    coordenadorId: null,
  },
  {
    // Estudo das telas de recrutamento do protótipo (Sprint 2); os candidatos ficam em candidatosSimulado
    id: 3,
    titulo: 'Acompanhamento de hábitos',
    objetivo: 'Acompanhar hábitos de sono, alimentação e atividade física ao longo de três visitas.',
    dataInicio: '2026-10-20',
    dataFim: '2026-12-20',
    limiteParticipantes: 30,
    estado: 'RECRUTAMENTO',
    responsavelId: ID_PESQUISADORA_SIMULADA,
    responsavelNome: NOME_PESQUISADORA_SIMULADA,
    coordenadorId: ID_COORDENADOR_SIMULADO,
  },
];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

/** O que o backend consulta no banco para decidir a mudança de estado. */
export type ConsultasEstado = {
  /** Protocolo do estudo: critérios, declaração de exclusões e visitas com as atividades. */
  protocolo(estudoId: number): Promise<Protocolo>;
  /** Se o estudo já teve alguma inclusão, mesmo que a pessoa tenha se retirado depois. */
  possuiInclusoes(estudoId: number): Promise<boolean>;
};

// Os serviços de protocolo e candidatos importam o de estudos: o import dinâmico, só na hora
// da consulta, evita o ciclo no carregamento dos módulos
const CONSULTAS_PADRAO: ConsultasEstado = {
  protocolo: async (id) => (await import('./protocolo')).servicoProtocolo.obter(id),
  possuiInclusoes: async (id) =>
    (await (await import('./candidatos')).servicoCandidatos.listar(id)).some((c) => c.dataInclusao),
};

// Consulta só o que o destino exige, como o switch do EstudoService.alterarEstado
async function consultarSituacao(
  consultas: ConsultasEstado,
  estudo: Estudo,
  destino: EstadoEstudo,
): Promise<SituacaoTransicao> {
  const situacao: SituacaoTransicao = { pendencias: [], visitasSemAtividade: [], possuiInclusoes: false };
  if (!permiteTransicao(estudo.estado, destino)) return situacao;
  if (destino === 'RECRUTAMENTO') {
    // As pendências dependem também do coordenador do estudo (seção 5)
    const protocolo = await consultas.protocolo(estudo.id);
    situacao.pendencias = calcularPendencias(protocolo, estudo.coordenadorId);
    situacao.visitasSemAtividade = visitasSemAtividade(protocolo.visitas);
  }
  if (destino === 'EXECUCAO' || (destino === 'ENCERRADO' && encerramentoAntecipado(estudo.estado))) {
    situacao.possuiInclusoes = await consultas.possuiInclusoes(estudo.id);
  }
  return situacao;
}

function montar(iniciais: Estudo[], consultas: ConsultasEstado) {
  let estudos = [...iniciais];

  const servico: ServicoEstudos = {
    async listar() {
      await aguardar();
      return [...estudos];
    },

    async cadastrar(entrada: EstudoCadastroEntrada) {
      await aguardar();

      // Mesma ordem do backend: primeiro os campos (@Valid), depois a regra das datas
      const { errosCampos, periodoInvalido } = validarEstudo(entrada);
      if (Object.keys(errosCampos).length > 0) {
        throw new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos,
        });
      }
      if (periodoInvalido) {
        throw new ErroRequisicao(400, {
          codigo: 'DATA_INVALIDA',
          mensagem: MENSAGEM_PERIODO_INVALIDO,
        });
      }

      const novo: Estudo = {
        ...entrada,
        titulo: entrada.titulo.trim(),
        objetivo: entrada.objetivo.trim(),
        id: Math.max(0, ...estudos.map((e) => e.id)) + 1,
        estado: 'PLANEJAMENTO',
        responsavelId: ID_PESQUISADORA_SIMULADA,
        responsavelNome: NOME_PESQUISADORA_SIMULADA,
        coordenadorId: entrada.coordenadorId ?? null,
        justificativaEncerramento: null,
      };
      estudos = [novo, ...estudos];
      return novo;
    },

    async alterarEstado(id: number, entrada: AlteracaoEstadoEntrada) {
      await aguardar();

      // Mesma ordem do backend: campos (@Valid), estudo da sessão (404) e depois as regras
      const erroCampos = validarEntradaEstado(entrada);
      if (erroCampos) throw new ErroRequisicao(400, erroCampos);
      const estudo = estudos.find((e) => e.id === id);
      if (!estudo) {
        throw new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Estudo não encontrado.' });
      }
      const erro = verificarTransicao(estudo.estado, entrada, await consultarSituacao(consultas, estudo, entrada.estado));
      if (erro) throw new ErroRequisicao(400, erro);

      const alterado: Estudo = {
        ...estudo,
        estado: entrada.estado,
        justificativaEncerramento: normalizarJustificativa(entrada.justificativaEncerramento),
      };
      estudos = estudos.map((e) => (e.id === id ? alterado : e));
      return { ...alterado };
    },
  };

  return { servico, reiniciar: () => (estudos = [...iniciais]) };
}

/** Cria um serviço com dados e consultas próprios. Usado pelos testes. */
export function criarServicoEstudosSimulado(iniciais: Estudo[], consultas: ConsultasEstado): ServicoEstudos {
  return montar(iniciais, consultas).servico;
}

const padrao = montar(ESTUDOS_INICIAIS, CONSULTAS_PADRAO);

export const servicoEstudosSimulado: ServicoEstudos = padrao.servico;

/** Volta aos dados iniciais. Usado pelos testes. */
export function reiniciarEstudosSimulados() {
  padrao.reiniciar();
}
