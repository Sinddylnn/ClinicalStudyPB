// <-------------------VALIDAÇÃO DO CANDIDATO------------------->
// Mesmas regras usadas pelo serviço simulado, para a tela e o "backend" concordarem
export type CampoCandidato = 'nome' | 'email';

export type DadosCandidato = Record<CampoCandidato, string>;

export const LIMITES_CANDIDATO = { nome: 150, email: 254 } as const;

// Formato simples: algo@algo.algo, sem espaços
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCandidato(dados: DadosCandidato): Partial<Record<CampoCandidato, string>> {
  const erros: Partial<Record<CampoCandidato, string>> = {};
  const nome = dados.nome.trim();
  const email = dados.email.trim();

  if (!nome) erros.nome = 'Informe o nome do candidato.';
  else if (nome.length > LIMITES_CANDIDATO.nome) erros.nome = 'Use até 150 caracteres.';

  if (!email || email.length > LIMITES_CANDIDATO.email || !FORMATO_EMAIL.test(email)) {
    erros.email = 'Informe um e-mail válido.';
  }
  return erros;
}

// <-------------------VALIDAÇÃO DO CONSENTIMENTO------------------->
export type CampoConsentimento = 'resposta' | 'observacao';

export const LIMITE_OBSERVACAO = 500;

export function validarConsentimento(dados: {
  resposta: string | null;
  observacao: string | null;
}): Partial<Record<CampoConsentimento, string>> {
  const erros: Partial<Record<CampoConsentimento, string>> = {};
  if (!dados.resposta) erros.resposta = 'Escolha a resposta do candidato.';
  if ((dados.observacao ?? '').trim().length > LIMITE_OBSERVACAO) {
    erros.observacao = 'A observação deve ter no máximo 500 caracteres.';
  }
  return erros;
}
