import type { PerfilUsuario } from '../routes/RotaProtegida';

// <-------------------SESSÃO SIMULADA------------------->
// A sessão real (GET /auth/sessao) entra na T13. Até lá, as telas que mostram
// a barra de navegação usam a pesquisadora fictícia do protótipo.
export type UsuarioSessao = {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
};

export const USUARIO_SIMULADO: UsuarioSessao = {
  nome: 'Paula Pesquisadora',
  email: 'paula.pesquisadora@exemplo.com',
  perfil: 'PESQUISADOR',
};
