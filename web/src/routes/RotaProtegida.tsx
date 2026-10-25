import { Outlet } from 'react-router';

// de acordo com o enum PerfilUsuario do backend
export type PerfilUsuario = 'ADMINISTRADOR' | 'PESQUISADOR' | 'COORDENADOR' | 'PARTICIPANTE';

type Props = {
  perfis?: PerfilUsuario[];
};

// <-------------------CONTROLE DE ACESSO NAS ROTAS------------------->
// Por enquanto libera todas as rotas; a verificação de sessão e perfil entra na T13.
// O backend continua sendo quem garante o acesso — esconder rota não é segurança.
export default function RotaProtegida({ perfis }: Props) {
  void perfis;      // será usado na T13
  return <Outlet />;
}