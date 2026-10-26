import { Navigate, Outlet, useLocation } from 'react-router';
import type { PerfilUsuario } from '../api/autenticacao';
import { useAutenticacao } from '../autenticacao/contextoAutenticacao';
import type { EstadoLogin } from '../pages/login/Login';

type Props = {
  perfis?: PerfilUsuario[];
};

// <-------------------CONTROLE DE ACESSO NAS ROTAS------------------->
// Sem sessão vai para o login (guardando a página pedida, exceto depois do Sair); perfil fora da lista, para acesso negado.
// O backend continua sendo quem garante o acesso — esconder rota não é segurança.
export default function RotaProtegida({ perfis }: Props) {
  const { usuario, carregando, saidaVoluntaria } = useAutenticacao();
  const local = useLocation();

  if (carregando) {
    return (
      <p className="carregando-sessao" role="status">
        Carregando…
      </p>
    );
  }

  if (!usuario) {
    // Depois do Sair, a página atual era de quem saiu: não vale para a próxima pessoa
    if (saidaVoluntaria) return <Navigate to="/login" replace />;
    const estado: EstadoLogin = { de: local.pathname + local.search };
    return <Navigate to="/login" replace state={estado} />;
  }

  if (perfis && !perfis.includes(usuario.perfil)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
