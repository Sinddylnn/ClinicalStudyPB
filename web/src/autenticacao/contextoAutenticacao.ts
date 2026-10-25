import { createContext, useContext } from 'react';
import type { UsuarioSessao } from '../api/autenticacao';

// <-------------------CONTEXTO DE AUTENTICAÇÃO------------------->
/**
 * Motivo para avisar no login por que a pessoa está lá:
 * a sessão de quem estava logado deixou de valer (401), ou
 * GET /auth/sessao falhou ao abrir a página (ex.: SEM_CONEXAO).
 */
export type AvisoSessao = 'sessaoExpirada' | 'falhaVerificacao';

export type Autenticacao = {
  /** null quando ninguém está logado. */
  usuario: UsuarioSessao | null;
  /** true enquanto GET /auth/sessao é consultado ao abrir a página. */
  carregando: boolean;
  /** null no primeiro acesso sem sessão e depois de entrar. */
  avisoSessao: AvisoSessao | null;
  /** true depois do Sair, até o próximo login: o /login abre sem página de origem. */
  saidaVoluntaria: boolean;
  /** Repassa o ErroRequisicao do login para a tela tratar. */
  entrar: (email: string, senha: string) => Promise<void>;
  /** Falha (sem limpar a sessão) quando o servidor não confirma o logout. */
  sair: () => Promise<void>;
};

// Valor fora do ProvedorAutenticacao: permite renderizar telas isoladas nos testes,
// recebendo o usuário por props
const SEM_PROVEDOR: Autenticacao = {
  usuario: null,
  carregando: false,
  avisoSessao: null,
  saidaVoluntaria: false,
  entrar: () => Promise.reject(new Error('ProvedorAutenticacao ausente.')),
  sair: () => Promise.resolve(),
};

export const ContextoAutenticacao = createContext<Autenticacao>(SEM_PROVEDOR);

// <-------------------HOOKS------------------->
export function useAutenticacao(): Autenticacao {
  return useContext(ContextoAutenticacao);
}

/**
 * Usuário das telas autenticadas: o recebido por props (testes) ou o da sessão.
 * Só falha se a tela for usada fora da RotaProtegida sem receber o usuário.
 */
export function useUsuarioLogado(usuarioProp?: UsuarioSessao): UsuarioSessao {
  const { usuario } = useAutenticacao();
  const logado = usuarioProp ?? usuario;
  if (!logado) throw new Error('Tela autenticada renderizada sem usuário na sessão.');
  return logado;
}
