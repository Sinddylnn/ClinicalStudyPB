import { Route, Routes } from 'react-router';
import RotaProtegida from './RotaProtegida';
import Inicio from '../pages/Inicio';
import AcessoNegado from '../pages/AcessoNegado';
import NaoEncontrada from '../pages/NaoEncontrada';
import PaginaProvisoria from '../pages/PaginaProvisoria';
import ListaEstudos from '../pages/estudos/ListaEstudos';
import NovoEstudo from '../pages/estudos/NovoEstudo';

// <-------------------ROTAS DA APLICAÇÃO------------------->
// Páginas provisórias serão substituídas nas tasks indicadas
export default function AppRoutes() {
  return (
    <Routes>
      {/* <-------------------ROTAS PÚBLICAS-------------------> */}
      <Route path="/login" element={<PaginaProvisoria titulo="Login" task="T13" />} />
      <Route path="/acesso-negado" element={<AcessoNegado />} />

      {/* <-------------------ROTAS AUTENTICADAS-------------------> */}
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Inicio />} />
      </Route>

      {/* <-------------------ADMINISTRADOR-------------------> */}
      <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
        <Route path="/usuarios" element={<PaginaProvisoria titulo="Usuários" task="T14" />} />
        <Route path="/usuarios/novo" element={<PaginaProvisoria titulo="Novo usuário" task="T14" />} />
        <Route path="/usuarios/:id/editar" element={<PaginaProvisoria titulo="Editar usuário" task="T14" />} />
      </Route>

      {/* <-------------------ESTUDOS-------------------> */}
      {/* Pesquisador e coordenador consultam; só o pesquisador cadastra (matriz 5.1) */}
      <Route element={<RotaProtegida perfis={['PESQUISADOR', 'COORDENADOR']} />}>
        <Route path="/estudos" element={<ListaEstudos />} />
      </Route>
      <Route element={<RotaProtegida perfis={['PESQUISADOR']} />}>
        <Route path="/estudos/novo" element={<NovoEstudo />} />
      </Route>

      {/* <-------------------ROTA NÃO ENCONTRADA-------------------> */}
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}