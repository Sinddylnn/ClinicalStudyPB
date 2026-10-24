import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';
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
});

// <-------------------PROTEÇÃO CSRF------------------->
// O backend guarda o token na sessão: ele é obtido em GET /auth/csrf
// e enviado no cabeçalho indicado em headerName (docs/autenticacao.md)
type CsrfResposta = {
  token: string;
  headerName: string;
};

const METODOS_DE_ALTERACAO = ['post', 'put', 'patch', 'delete'];

// Login e logout renovam a sessão e descartam o token anterior
const ROTAS_QUE_RENOVAM_CSRF = ['/auth/login', '/auth/logout'];

let tokenCsrf: CsrfResposta | null = null;

// Requisições já repetidas após CSRF_INVALIDO, para não repetir em loop
const repetidasPorCsrf = new WeakSet<InternalAxiosRequestConfig>();

async function obterTokenCsrf(): Promise<CsrfResposta> {
  if (!tokenCsrf) {
    const { data } = await api.get<CsrfResposta>('/auth/csrf');
    tokenCsrf = data;
  }
  return tokenCsrf;
}

/** Força uma nova consulta do token na próxima alteração. */
export function descartarTokenCsrf() {
  tokenCsrf = null;
}

// <-------------------INTERCEPTOR DE REQUISIÇÕES------------------->
// Acrescenta o token CSRF em POST, PUT, PATCH e DELETE
api.interceptors.request.use(async (config) => {
  if (METODOS_DE_ALTERACAO.includes(config.method ?? '')) {
    const { token, headerName } = await obterTokenCsrf();
    config.headers.set(headerName, token);
  }
  return config;
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
  (resposta) => {
    if (ROTAS_QUE_RENOVAM_CSRF.includes(resposta.config.url ?? '')) descartarTokenCsrf();
    return resposta;
  },
  (erro: unknown) => {
    const erroRequisicao = converterErro(erro);
    const config = isAxiosError(erro) ? erro.config : undefined;

    // Token vencido ou descartado: busca outro e repete a requisição uma única vez
    if (erroRequisicao.codigo === 'CSRF_INVALIDO' && config && !repetidasPorCsrf.has(config)) {
      repetidasPorCsrf.add(config);
      descartarTokenCsrf();
      return api.request(config);
    }

    // No login, 401 significa credenciais inválidas, e não sessão expirada
    const ehLogin = config?.url === '/auth/login';
    if (erroRequisicao.status === 401 && !ehLogin) tratadores.naoAutenticado?.();
    if (erroRequisicao.codigo === 'ACESSO_NEGADO') tratadores.acessoNegado?.();

    return Promise.reject(erroRequisicao);
  },
);
