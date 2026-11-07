import { ErroRequisicao } from './erros';
import { servicoEstudos, type ServicoEstudos } from './estudos';
import { servicoEstudosSimulado } from './estudosSimulado';
import type {
  AtividadePrevista,
  Criterio,
  CriterioCadastroEntrada,
  Protocolo,
  ServicoProtocolo,
  TipoCriterio,
  VisitaPrevista,
} from './protocolo';
import { normalizarVisita, validarAtividade, validarVisita } from '../pages/protocolo/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os protocolos em memória e responde como o backend (CriterioService e VisitaPrevistaService),
// com as mesmas mensagens e a mesma ordem de verificação: campos (@Valid), estudo da sessão (404),
// estudo em Planejamento, item do estudo (404) e as regras de cada operação.
// Modelagem, seção 3: cadastrar ou editar uma exclusão com a declaração "sem exclusão" marcada é
// recusado (CRITERIOS_EXCLUSAO_INCONSISTENTES); a declaração só muda por escolha do pesquisador.
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ATRASO_MS = 300;

// Estudos 1 (Planejamento) e 3 (Recrutamento) dos estudos simulados; o estudo 2 ainda não tem protocolo.
// No estudo 1, a visita de acompanhamento ainda não tem atividade: o quadro mostra a pendência
export const PROTOCOLOS_INICIAIS: Protocolo[] = [
  {
    estudoId: 1,
    criteriosInclusao: [
      { id: 1, descricao: 'Estudantes de graduação matriculados, com idade entre 18 e 30 anos.' },
      { id: 2, descricao: 'Disponibilidade para registrar a rotina de sono por quatro semanas.' },
    ],
    criteriosExclusao: [],
    semCriteriosExclusao: false,
    visitas: [
      {
        id: 1,
        nome: 'Visita inicial',
        descricao: 'Apresentação do estudo e orientação sobre o diário de sono.',
        ordem: 1,
        atividades: [
          { id: 1, descricao: 'Aplicar questionário fictício sobre hábitos de sono.' },
          { id: 2, descricao: 'Entregar o diário de sono para as quatro semanas.' },
        ],
      },
      { id: 2, nome: 'Acompanhamento', descricao: null, ordem: 2, atividades: [] },
    ],
  },
  {
    estudoId: 3,
    criteriosInclusao: [{ id: 3, descricao: 'Adultos com idade entre 18 e 60 anos.' }],
    criteriosExclusao: [{ id: 4, descricao: 'Gestantes ou lactantes.' }],
    semCriteriosExclusao: false,
    visitas: [
      {
        id: 3,
        nome: 'Visita inicial',
        descricao: null,
        ordem: 1,
        atividades: [{ id: 3, descricao: 'Registrar hábitos de sono, alimentação e atividade física.' }],
      },
      {
        id: 4,
        nome: 'Visita de acompanhamento',
        descricao: 'Revisão dos registros da primeira semana.',
        ordem: 2,
        atividades: [{ id: 4, descricao: 'Conferir os registros com o participante.' }],
      },
      {
        id: 5,
        nome: 'Visita final',
        descricao: null,
        ordem: 3,
        atividades: [{ id: 5, descricao: 'Aplicar questionário fictício de encerramento.' }],
      },
    ],
  },
];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

const LISTAS: Record<TipoCriterio, 'criteriosInclusao' | 'criteriosExclusao'> = {
  INCLUSAO: 'criteriosInclusao',
  EXCLUSAO: 'criteriosExclusao',
};

// CriterioCadastroEntrada do backend; a tela usa os próprios textos (validarCriterio)
function validarCriterioApi({ tipo, descricao }: CriterioCadastroEntrada): Record<string, string> {
  const erros: Record<string, string> = {};
  if (tipo !== 'INCLUSAO' && tipo !== 'EXCLUSAO') erros.tipo = 'Informe o tipo do critério.';
  const texto = (descricao ?? '').trim();
  if (!texto) erros.descricao = 'Informe a descrição do critério.';
  else if (texto.length > 1000) erros.descricao = 'A descrição deve ter no máximo 1000 caracteres.';
  return erros;
}

function erroValidacao(errosCampos: Record<string, string>) {
  return new ErroRequisicao(400, {
    codigo: 'VALIDACAO_INVALIDA',
    mensagem: 'Confira os campos informados.',
    errosCampos,
  });
}

const naoEncontrado = (mensagem: string) =>
  new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem });

// Cópia profunda: quem recebe o protocolo não altera o que está guardado
const copiarVisita = (v: VisitaPrevista): VisitaPrevista => ({ ...v, atividades: v.atividades.map((a) => ({ ...a })) });

const copiar = (p: Protocolo): Protocolo => ({
  ...p,
  criteriosInclusao: p.criteriosInclusao.map((c) => ({ ...c })),
  criteriosExclusao: p.criteriosExclusao.map((c) => ({ ...c })),
  visitas: p.visitas.map(copiarVisita),
});

const emOrdem = (visitas: VisitaPrevista[]) => [...visitas].sort((a, b) => a.ordem - b.ordem);

/**
 * Cria o serviço sobre a mesma fonte de estudos que as telas usam: assim o
 * "não encontrado" e o estado do estudo seguem o serviço de estudos em uso.
 */
export function criarServicoProtocoloSimulado(estudos: ServicoEstudos, iniciais: Protocolo[]): ServicoProtocolo {
  let protocolos = iniciais.map(copiar);

  async function buscarEstudo(estudoId: number) {
    const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
    if (!estudo) throw naoEncontrado('Estudo não encontrado.');
    return estudo;
  }

  // Só o estudo em Planejamento aceita mudanças no protocolo (kickoff 8.1); cada serviço tem sua mensagem
  function exigirPlanejamento(estado: string, mensagem: string) {
    if (estado !== 'PLANEJAMENTO') {
      throw new ErroRequisicao(400, { codigo: 'ESTUDO_FORA_PLANEJAMENTO', mensagem });
    }
  }

  const exigirPlanejamentoCriterios = (estado: string) =>
    exigirPlanejamento(estado, 'Os critérios só podem ser alterados enquanto o estudo estiver em planejamento.');

  const exigirPlanejamentoVisitas = (estado: string) =>
    exigirPlanejamento(
      estado,
      'As visitas previstas só podem ser alteradas enquanto o estudo estiver em planejamento.',
    );

  // Sem protocolo, o estudo responde com as listas vazias (o protocolo nasce no primeiro cadastro)
  function protocoloDe(estudoId: number): Protocolo {
    return (
      protocolos.find((p) => p.estudoId === estudoId) ?? {
        estudoId,
        criteriosInclusao: [],
        criteriosExclusao: [],
        semCriteriosExclusao: false,
        visitas: [],
      }
    );
  }

  function salvar(protocolo: Protocolo) {
    protocolos = [...protocolos.filter((p) => p.estudoId !== protocolo.estudoId), protocolo];
  }

  // Procura o critério nas duas listas do protocolo do estudo
  function tipoDoCriterio(protocolo: Protocolo, criterioId: number): TipoCriterio {
    if (protocolo.criteriosInclusao.some((c) => c.id === criterioId)) return 'INCLUSAO';
    if (protocolo.criteriosExclusao.some((c) => c.id === criterioId)) return 'EXCLUSAO';
    throw naoEncontrado('Critério não encontrado.');
  }

  // A visita precisa ser do protocolo do estudo informado (modelagem, seção 2.6)
  function buscarVisita(protocolo: Protocolo, visitaId: number): VisitaPrevista {
    const visita = protocolo.visitas.find((v) => v.id === visitaId);
    if (!visita) throw naoEncontrado('Visita prevista não encontrada.');
    return visita;
  }

  // A atividade precisa ser da visita informada
  function exigirAtividade(visita: VisitaPrevista, atividadeId: number) {
    if (!visita.atividades.some((a) => a.id === atividadeId)) throw naoEncontrado('Atividade prevista não encontrada.');
  }

  function exigirOrdemLivre(protocolo: Protocolo, ordem: number, visitaId?: number) {
    if (protocolo.visitas.some((v) => v.ordem === ordem && v.id !== visitaId)) {
      throw new ErroRequisicao(400, {
        codigo: 'ORDEM_VISITA_DUPLICADA',
        mensagem: 'Já existe uma visita prevista com essa ordem.',
      });
    }
  }

  function trocarVisita(protocolo: Protocolo, visita: VisitaPrevista) {
    salvar({ ...protocolo, visitas: emOrdem(protocolo.visitas.map((v) => (v.id === visita.id ? visita : v))) });
  }

  const proximoId = (ids: number[]) => Math.max(0, ...ids) + 1;
  const idsCriterios = () => protocolos.flatMap((p) => [...p.criteriosInclusao, ...p.criteriosExclusao]).map((c) => c.id);
  const idsVisitas = () => protocolos.flatMap((p) => p.visitas).map((v) => v.id);
  const idsAtividades = () => protocolos.flatMap((p) => p.visitas.flatMap((v) => v.atividades)).map((a) => a.id);

  // Campos primeiro, como o @Valid do backend; o atraso vem depois de achar o estudo
  function exigirCriterioValido(entrada: CriterioCadastroEntrada) {
    const erros = validarCriterioApi(entrada);
    if (Object.keys(erros).length > 0) throw erroValidacao(erros);
  }

  // CriterioService.validarExclusao: vale para cadastrar e para editar
  function exigirExclusaoPermitida(protocolo: Protocolo, tipo: TipoCriterio) {
    if (tipo === 'EXCLUSAO' && protocolo.semCriteriosExclusao) {
      throw new ErroRequisicao(400, {
        codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
        mensagem: 'Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.',
      });
    }
  }

  function exigirVisitaValida(entrada: Parameters<typeof validarVisita>[0]) {
    const erros = validarVisita(entrada);
    if (Object.keys(erros).length > 0) throw erroValidacao(erros);
  }

  function exigirAtividadeValida(descricao: string) {
    const erro = validarAtividade(descricao);
    if (erro) throw erroValidacao({ descricao: erro });
  }

  return {
    recursos: { editarRemover: true },

    async obter(estudoId) {
      await buscarEstudo(estudoId);
      await aguardar();
      return copiar(protocoloDe(estudoId));
    },

    async adicionarCriterio(estudoId, entrada) {
      exigirCriterioValido(entrada);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoCriterios(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      // Modelagem, seção 3: com a declaração marcada, o pesquisador desmarca antes de cadastrar
      exigirExclusaoPermitida(protocolo, entrada.tipo);

      const novo: Criterio = { id: proximoId(idsCriterios()), descricao: entrada.descricao.trim() };
      const lista = LISTAS[entrada.tipo];
      salvar({ ...protocolo, [lista]: [...protocolo[lista], novo] });
      return { ...novo };
    },

    async editarCriterio(estudoId, criterioId, entrada) {
      exigirCriterioValido(entrada);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoCriterios(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const origem = LISTAS[tipoDoCriterio(protocolo, criterioId)];
      exigirExclusaoPermitida(protocolo, entrada.tipo);

      // O backend grava o tipo enviado: se mudar, o critério passa para a outra lista (em ordem de id)
      const destino = LISTAS[entrada.tipo];
      const editado: Criterio = { id: criterioId, descricao: entrada.descricao.trim() };
      const semEle = { ...protocolo, [origem]: protocolo[origem].filter((c) => c.id !== criterioId) };
      salvar({ ...semEle, [destino]: [...semEle[destino], editado].sort((a, b) => a.id - b.id) });
      return { ...editado };
    },

    async removerCriterio(estudoId, criterioId) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoCriterios(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const lista = LISTAS[tipoDoCriterio(protocolo, criterioId)];
      salvar({ ...protocolo, [lista]: protocolo[lista].filter((c) => c.id !== criterioId) });
    },

    async definirSemExclusao(estudoId, semCriteriosExclusao) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoCriterios(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      if (semCriteriosExclusao && protocolo.criteriosExclusao.length > 0) {
        throw new ErroRequisicao(400, {
          codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
          mensagem: 'O estudo possui critérios de exclusão cadastrados.',
        });
      }
      salvar({ ...protocolo, semCriteriosExclusao });
      return semCriteriosExclusao;
    },

    async adicionarVisita(estudoId, entrada) {
      exigirVisitaValida(entrada);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const dados = normalizarVisita(entrada);
      exigirOrdemLivre(protocolo, dados.ordem);

      const nova: VisitaPrevista = { id: proximoId(idsVisitas()), ...dados, atividades: [] };
      salvar({ ...protocolo, visitas: emOrdem([...protocolo.visitas, nova]) });
      return copiarVisita(nova);
    },

    async editarVisita(estudoId, visitaId, entrada) {
      exigirVisitaValida(entrada);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const visita = buscarVisita(protocolo, visitaId);
      const dados = normalizarVisita(entrada);
      // A própria visita pode manter a ordem que já tem
      exigirOrdemLivre(protocolo, dados.ordem, visitaId);

      const editada: VisitaPrevista = { ...visita, ...dados };
      trocarVisita(protocolo, editada);
      return copiarVisita(editada);
    },

    async removerVisita(estudoId, visitaId) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      buscarVisita(protocolo, visitaId);
      // As atividades fazem parte da visita: saem junto, sem ficar sem vínculo (seção 4.2)
      salvar({ ...protocolo, visitas: protocolo.visitas.filter((v) => v.id !== visitaId) });
    },

    async adicionarAtividade(estudoId, visitaId, descricao) {
      exigirAtividadeValida(descricao);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const visita = buscarVisita(protocolo, visitaId);
      const nova: AtividadePrevista = { id: proximoId(idsAtividades()), descricao: descricao.trim() };
      trocarVisita(protocolo, { ...visita, atividades: [...visita.atividades, nova] });
      return { ...nova };
    },

    async editarAtividade(estudoId, visitaId, atividadeId, descricao) {
      exigirAtividadeValida(descricao);
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const visita = buscarVisita(protocolo, visitaId);
      exigirAtividade(visita, atividadeId);
      const editada: AtividadePrevista = { id: atividadeId, descricao: descricao.trim() };
      trocarVisita(protocolo, {
        ...visita,
        atividades: visita.atividades.map((a) => (a.id === atividadeId ? editada : a)),
      });
      return { ...editada };
    },

    async removerAtividade(estudoId, visitaId, atividadeId) {
      const estudo = await buscarEstudo(estudoId);
      await aguardar();
      exigirPlanejamentoVisitas(estudo.estado);

      const protocolo = protocoloDe(estudoId);
      const visita = buscarVisita(protocolo, visitaId);
      exigirAtividade(visita, atividadeId);
      trocarVisita(protocolo, { ...visita, atividades: visita.atividades.filter((a) => a.id !== atividadeId) });
    },
  };
}

// Com estudos reais, os protocolos fictícios cairiam em estudos reais de mesmo id: começa vazio
export const servicoProtocoloSimulado = criarServicoProtocoloSimulado(
  servicoEstudos,
  servicoEstudos === servicoEstudosSimulado ? PROTOCOLOS_INICIAIS : [],
);
