import { API_URL } from '../config/api';

export type PerfilUsuario = 'ADMINISTRADOR' | 'PESQUISADOR' | 'COORDENADOR' | 'PARTICIPANTE';

// SessaoResposta: id, nome, email e perfil, devolvidos pelo login
export type Sessao = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
};

// 401 em POST /auth/login (CREDENCIAIS_INVALIDAS)
export class CredenciaisInvalidasError extends Error {}

type Csrf = { headerName: string; token: string };

// Os cookies da sessão (JSESSIONID) ficam no armazenamento nativo do sistema
// e são reenviados com credentials: 'include'.
async function obterCsrf(): Promise<Csrf> {
  const res = await fetch(`${API_URL}/auth/csrf`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Falha ao obter o CSRF.');
  const dados = await res.json(); // CsrfResposta: { token, headerName }
  return { headerName: dados.headerName ?? 'X-CSRF-TOKEN', token: dados.token };
}

export async function login(email: string, senha: string): Promise<Sessao> {
  const csrf = await obterCsrf();
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({ email, senha }), // LoginEntrada: email() e senha()
  });
  if (res.status === 400 || res.status === 401) throw new CredenciaisInvalidasError();
  if (!res.ok) throw new Error('Falha no login.');
  return res.json(); // SessaoResposta devolvida pelo login
}

export async function logout(): Promise<void> {
  // O login renova a sessão e descarta o token anterior: busca um novo.
  const csrf = await obterCsrf();
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!res.ok) throw new Error('Falha no logout.');
}
