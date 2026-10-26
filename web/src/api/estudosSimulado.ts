import { ErroRequisicao } from './erros';
import type { Estudo, EstudoCadastroEntrada, ServicoEstudos } from './estudos';
import { MENSAGEM_PERIODO_INVALIDO, validarEstudo } from '../pages/estudos/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os estudos em memória e responde como o backend: mesmos campos,
// mesmos códigos de erro e o estudo novo sempre em PLANEJAMENTO.
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
];

let estudos = [...ESTUDOS_INICIAIS];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

/** Volta aos dados iniciais. Usado pelos testes. */
export function reiniciarEstudosSimulados() {
  estudos = [...ESTUDOS_INICIAIS];
}

export const servicoEstudosSimulado: ServicoEstudos = {
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
    };
    estudos = [novo, ...estudos];
    return novo;
  },
};
