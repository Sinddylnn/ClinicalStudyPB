import { Route, Routes } from 'react-router';
import RotaProtegida from './RotaProtegida';
import Inicio from '../pages/Inicio';
import AcessoNegado from '../pages/AcessoNegado';
import NaoEncontrada from '../pages/NaoEncontrada';
import Login from '../pages/login/Login';
import ListaEstudos from '../pages/estudos/ListaEstudos';
import NovoEstudo from '../pages/estudos/NovoEstudo';
import Recrutamento from '../pages/recrutamento/Recrutamento';
import NovoCandidato from '../pages/recrutamento/NovoCandidato';
import ListaUsuarios from '../pages/usuarios/ListaUsuarios';
import NovoUsuario from '../pages/usuarios/NovoUsuario';
import EditarUsuario from '../pages/usuarios/EditarUsuario';

// <-------------------ROTAS DA APLICAÇÃO------------------->
export default function AppRoutes() {
  return (
    <Routes>
      {/* <-------------------ROTAS PÚBLICAS-------------------> */}
      <Route path="/login" element={<Login />} />
      <Route path="/acesso-negado" element={<AcessoNegado />} />

      {/* <-------------------ROTAS AUTENTICADAS-------------------> */}
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Inicio />} />
      </Route>

      {/* <-------------------ADMINISTRADOR-------------------> */}
      <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
        <Route path="/usuarios" element={<ListaUsuarios />} />
        <Route path="/usuarios/novo" element={<NovoUsuario />} />
        <Route path="/usuarios/:id/editar" element={<EditarUsuario />} />
      </Route>

      {/* <-------------------ESTUDOS-------------------> */}
      {/* Pesquisador e coordenador consultam; só o pesquisador cadastra (matriz 5.1) */}
      <Route element={<RotaProtegida perfis={['PESQUISADOR', 'COORDENADOR']} />}>
        <Route path="/estudos" element={<ListaEstudos />} />
      </Route>
      <Route element={<RotaProtegida perfis={['PESQUISADOR']} />}>
        <Route path="/estudos/novo" element={<NovoEstudo />} />
      </Route>

      {/* <-------------------RECRUTAMENTO-------------------> */}
      {/* O coordenador cadastra e acompanha os candidatos dos estudos vinculados (RF08) */}
      <Route element={<RotaProtegida perfis={['COORDENADOR']} />}>
        <Route path="/estudos/:id/recrutamento" element={<Recrutamento />} />
        <Route path="/estudos/:id/candidatos/novo" element={<NovoCandidato />} />
      </Route>

      {/* <-------------------ROTA NÃO ENCONTRADA-------------------> */}
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}