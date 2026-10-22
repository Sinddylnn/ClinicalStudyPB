import axios from 'axios';
import { converterErro } from './erros';

// <-------------------CLIENTE HTTP------------------->
/**
 * Instância única do Axios usada por todos os serviços da web.
 * Em desenvolvimento, '/api' é encaminhado ao backend pelo proxy do Vite.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
  // Envia o cookie de sessão (HttpOnly) em todas as requisições
  withCredentials: true,
  // Nomes padrão do Spring Security: lê o token do cookie e devolve no header
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// <-------------------TRATAMENTO DE SESSÃO------------------->
// Ações executadas quando a API recusa a requisição; registradas na T13
type TratadoresSessao = {
  naoAutenticado?: () => void; // 401: sessão ausente, expirada ou conta desativada
  acessoNegado?: () => void; // 403: autenticado, mas sem permissão
};

const tratadores: TratadoresSessao = {};

export function registrarTratadoresSessao(novos: TratadoresSessao) {
  Object.assign(tratadores, novos);
}

// <-------------------INTERCEPTOR DE RESPOSTAS------------------->
// Toda falha chega às telas como ErroRequisicao, no formato do backend
api.interceptors.response.use(
  (resposta) => resposta,
  (erro: unknown) => {
    const erroRequisicao = converterErro(erro);

    if (erroRequisicao.status === 401) tratadores.naoAutenticado?.();
    if (erroRequisicao.status === 403) tratadores.acessoNegado?.();

    return Promise.reject(erroRequisicao);
  },
);