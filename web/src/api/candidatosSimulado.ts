import type { Candidato, CandidatoCadastroEntrada, ServicoCandidatos } from './candidatos';
import { ErroRequisicao } from './erros';
import { servicoEstudosSimulado } from './estudosSimulado';
import { validarCandidato } from '../pages/recrutamento/validacao';

// <-------------------SERVIÇO SIMULADO------------------->
// Guarda os candidatos em memória e responde como o backend deve responder:
// 404 para estudo inexistente, 409 para e-mail repetido no estudo ou estudo fora de Recrutamento.
// Os dados são fictícios e voltam ao estado inicial ao recarregar a página.
const ATRASO_MS = 300;

// Estudo "Acompanhamento de hábitos", com os mesmos candidatos do protótipo
const ESTUDO_RECRUTAMENTO = 3;

const CANDIDATOS_INICIAIS: Candidato[] = [
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

let candidatos = [...CANDIDATOS_INICIAIS];

const aguardar = () => new Promise((resolver) => setTimeout(resolver, ATRASO_MS));

/** Volta aos dados iniciais. Usado pelos testes. */
export function reiniciarCandidatosSimulados() {
  candidatos = [...CANDIDATOS_INICIAIS];
}

// O e-mail é comparado sem diferença de maiúsculas, como o cadastro de usuários
const normalizarEmail = (email: string) => email.trim().toLowerCase();

async function buscarEstudo(estudoId: number) {
  const estudo = (await servicoEstudosSimulado.listar()).find((e) => e.id === estudoId);
  if (!estudo) {
    throw new ErroRequisicao(404, {
      codigo: 'RECURSO_NAO_ENCONTRADO',
      mensagem: 'Estudo não encontrado.',
    });
  }
  return estudo;
}

export const servicoCandidatosSimulado: ServicoCandidatos = {
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
      throw new ErroRequisicao(409, {
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
};
