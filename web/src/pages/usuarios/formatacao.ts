import type { PerfilUsuario } from '../../api/autenticacao';

// <-------------------NOMES EXIBIDOS------------------->
// Mesma ordem do seletor de perfil e do texto de ajuda do protótipo
export const NOMES_PERFIL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  PESQUISADOR: 'Pesquisador',
  COORDENADOR: 'Coordenador',
  PARTICIPANTE: 'Participante',
};

export const PERFIS = Object.keys(NOMES_PERFIL) as PerfilUsuario[];
