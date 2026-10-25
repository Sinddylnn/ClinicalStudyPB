import { api } from './cliente';
import { ErroRequisicao } from './erros';

// <-------------------CONTRATO DA SESSÃO------------------->
// De acordo com o enum PerfilUsuario do backend
export type PerfilUsuario = 'ADMINISTRADOR' | 'PESQUISADOR' | 'COORDENADOR' | 'PARTICIPANTE';

/** Dados públicos devolvidos por POST /auth/login e GET /auth/sessao (docs/autenticacao.md). */
export type UsuarioSessao = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
};

// <-------------------CHAMADAS DE AUTENTICAÇÃO------------------->
// O cliente cuida do cookie e do CSRF; aqui ficam só os endereços e formatos

/** Abre a sessão. A senha segue exatamente como foi digitada. */
export async function login(email: string, senha: string): Promise<UsuarioSessao> {
  const { data } = await api.post<UsuarioSessao>('/auth/login', { email: email.trim(), senha });
  return data;
}

/** Invalida a sessão no servidor (204). */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** Usuário da sessão atual, ou null quando não há sessão válida (401). */
export async function sessaoAtual(): Promise<UsuarioSessao | null> {
  try {
    const { data } = await api.get<UsuarioSessao>('/auth/sessao');
    return data;
  } catch (erro) {
    if (erro instanceof ErroRequisicao && erro.status === 401) return null;
    throw erro;
  }
}
