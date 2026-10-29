import { ErroRequisicao } from './erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from './estudos';
import { servicoEstudosSimulado } from './estudosSimulado';
import type { Criterio, Protocolo, ServicoProtocolo, TipoCriterio } from './protocolo';
import { calcularPendencias, validarCriterio } from '../pages/protocolo/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os protocolos em memória e responde como o backend deve responder:
// 404 para estudo fora da lista da sessão ou critério inexistente e 400 para descrição inválida,
// estudo fora de Planejamento e as combinações proibidas da seção 3 da modelagem: declarar
// "sem exclusão" com exclusões cadastradas ou cadastrar exclusão com a declaração marcada.
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ATRASO_MS = 300;

/** Protocolo como fica guardado; as pendências são calculadas a cada resposta. */
export type ProtocoloSimulado = Omit<Protocolo, 'pendenciasRecrutamento'>;

// Estudos 1 (Planejamento) e 3 (Recrutamento) dos estudos simulados; o estudo 2 ainda não tem protocolo
export const PROTOCOLOS_INICIAIS: ProtocoloSimulado[] = [
  {
    estudoId: 1,
    criteriosInclusao: [
      { id: 1, descricao: 'Estudantes de graduação matriculados, com idade entre 18 e 30 anos.' },
      { id: 2, descricao: 'Disponibilidade para registrar a rotina de sono por quatro semanas.' },
    ],
    criteriosExclusao: [],
    semCriteriosExclusao: false,
  },
  {
    estudoId: 3,
    criteriosInclusao: [{ id: 3, descricao: 'Adultos com idade entre 18 e 60 anos.' }],
    criteriosExclusao: [{ id: 4, descricao: 'Gestantes ou lactantes.' }],
    semCriteriosExclusao: false,
  },
];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

const LISTAS: Record<TipoCriterio, 'criteriosInclusao' | 'criteriosExclusao'> = {
  INCLUSAO: 'criteriosInclusao',
  EXCLUSAO: 'criteriosExclusao',
};

function erroValidacao(mensagem: string) {
  return new ErroRequisicao(400, {
    codigo: 'VALIDACAO_INVALIDA',
    mensagem: 'Confira os campos informados.',
    errosCampos: { descricao: mensagem },
  });
}

const naoEncontrado = (mensagem: string) =>
  new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem });

/**
 * Cria o serviço sobre a mesma fonte de estudos que as telas usam: assim o
 * "não encontrado" e o estado do estudo seguem o serviço de estudos em uso.
 */
export function criarServicoProtocoloSimulado(
  estudos: ServicoEstudos,
  iniciais: ProtocoloSimulado[],
): ServicoProtocolo {
  let protocolos = iniciais.map((p) => ({
    ...p,
    criteriosInclusao: [...p.criteriosInclusao],
    criteriosExclusao: [...p.criteriosExclusao],
  }));

  async function buscarEstudo(estudoId: number) {
    const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
    if (!estudo) throw naoEncontrado('Estudo não encontrado.');
    return estudo;
  }

  // Só o estudo em Planejamento aceita mudanças no protocolo (kickoff 8.1)
  function exigirPlanejamento(estado: string) {
    if (estado !== 'PLANEJAMENTO') {
      throw new ErroRequisicao(400, {
        codigo: 'ESTUDO_FORA_DE_PLANEJAMENTO',
        mensagem: 'O protocolo só pode ser alterado com o estudo em Planejamento.',
      });
    }
  }

  // Sem protocolo, o estudo responde com as listas vazias (o protocolo nasce no primeiro critério)
  function protocoloDe(estudoId: number): ProtocoloSimulado {
    return (
      protocolos.find((p) => p.estudoId === estudoId) ?? {
        estudoId,
        criteriosInclusao: [],
        criteriosExclusao: [],
        semCriteriosExclusao: false,
      }
    );
  }

  function salvar(protocolo: ProtocoloSimulado) {
    protocolos = [...protocolos.filter((p) => p.estudoId !== protocolo.estudoId), protocolo];
  }

  // As pendências dependem também do estudo (coordenador atribuído, seção 5 da modelagem)
  function resposta(protocolo: ProtocoloSimulado, estudo: Estudo): Protocolo {
    return {
      ...protocolo,
      criteriosInclusao: [...protocolo.criteriosInclusao],
      criteriosExclusao: [...protocolo.criteriosExclusao],
      pendenciasRecrutamento: calcularPendencias(protocolo, estudo.coordenadorId),
    };
  }

  // Procura o critério nas duas listas do protocolo do estudo
  function tipoDoCriterio(protocolo: ProtocoloSimulado, criterioId: number): TipoCriterio {
    if (protocolo.criteriosInclusao.some((c) => c.id === criterioId)) return 'INCLUSAO';
    if (protocolo.criteriosExclusao.some((c) => c.id === criterioId)) return 'EXCLUSAO';
    throw naoEncontrado('Critério não encontrado.');
  }

  const proximoId = () =>
    Math.max(0, ...protocolos.flatMap((p) => [...p.criteriosInclusao, ...p.criteriosExclusao]).map((c) => c.id)) + 1;

  return {
    async obter(estudoId) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      return resposta(protocoloDe(estudoId), estudo);
    },

    async adicionarCriterio(estudoId, entrada) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();

      // Mesma ordem do backend: primeiro os campos (@Valid), depois as regras do estudo
      const erro = validarCriterio(entrada.descricao);
      if (erro) throw erroValidacao(erro);
      exigirPlanejamento(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      // Exclusão com a declaração marcada é combinação inválida: o pesquisador desmarca antes (seção 3)
      if (entrada.tipo === 'EXCLUSAO' && protocolo.semCriteriosExclusao) {
        throw new ErroRequisicao(400, {
          codigo: 'SEM_EXCLUSAO_DECLARADA',
          mensagem:
            'Desmarque a opção de que o estudo não possui critérios de exclusão antes de cadastrar um.',
        });
      }

      const novo: Criterio = { id: proximoId(), descricao: entrada.descricao.trim() };
      const lista = LISTAS[entrada.tipo];
      salvar({ ...protocolo, [lista]: [...protocolo[lista], novo] });
      return { ...novo };
    },

    async editarCriterio(estudoId, criterioId, descricao) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();

      const erro = validarCriterio(descricao);
      if (erro) throw erroValidacao(erro);
      exigirPlanejamento(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const lista = LISTAS[tipoDoCriterio(protocolo, criterioId)];
      const editado: Criterio = { id: criterioId, descricao: descricao.trim() };
      salvar({ ...protocolo, [lista]: protocolo[lista].map((c) => (c.id === criterioId ? editado : c)) });
      return { ...editado };
    },

    async removerCriterio(estudoId, criterioId) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamento(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const lista = LISTAS[tipoDoCriterio(protocolo, criterioId)];
      salvar({ ...protocolo, [lista]: protocolo[lista].filter((c) => c.id !== criterioId) });
    },

    async definirSemExclusao(estudoId, semCriteriosExclusao) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamento(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      if (semCriteriosExclusao && protocolo.criteriosExclusao.length > 0) {
        throw new ErroRequisicao(400, {
          codigo: 'EXCLUSAO_JA_DEFINIDA',
          mensagem: 'Remova os critérios de exclusão antes de indicar que o estudo não possui nenhum.',
        });
      }
      const atualizado = { ...protocolo, semCriteriosExclusao };
      salvar(atualizado);
      return resposta(atualizado, estudo);
    },
  };
}

// Com estudos reais, os protocolos fictícios cairiam em estudos reais de mesmo id: começa vazio
export const servicoProtocoloSimulado = criarServicoProtocoloSimulado(
  servicoEstudos,
  servicoEstudos === servicoEstudosSimulado ? PROTOCOLOS_INICIAIS : [],
);
