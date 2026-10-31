import { Route, Routes } from 'react-router';
import RotaProtegida from './RotaProtegida';
import Inicio from '../pages/Inicio';
import AcessoNegado from '../pages/AcessoNegado';
import NaoEncontrada from '../pages/NaoEncontrada';
import Login from '../pages/login/Login';
import ListaEstudos from '../pages/estudos/ListaEstudos';
import NovoEstudo from '../pages/estudos/NovoEstudo';
import ProtocoloEstudo from '../pages/protocolo/ProtocoloEstudo';
import Recrutamento from '../pages/recrutamento/Recrutamento';
import NovoCandidato from '../pages/recrutamento/NovoCandidato';
import ElegibilidadeCandidato from '../pages/recrutamento/ElegibilidadeCandidato';
import ConsentimentoCandidato from '../pages/recrutamento/ConsentimentoCandidato';
import InclusaoCandidato from '../pages/recrutamento/InclusaoCandidato';
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
        {/* Protocolo do estudo: critérios de inclusão e exclusão (RF05). A consulta pelo coordenador entra com a T51 */}
        <Route path="/estudos/:id" element={<ProtocoloEstudo />} />
      </Route>

      {/* <-------------------RECRUTAMENTO-------------------> */}
      {/* O coordenador cadastra e acompanha os candidatos dos estudos vinculados (RF08) */}
      <Route element={<RotaProtegida perfis={['COORDENADOR']} />}>
        <Route path="/estudos/:id/recrutamento" element={<Recrutamento />} />
        <Route path="/estudos/:id/candidatos/novo" element={<NovoCandidato />} />
        {/* Avaliação de elegibilidade do candidato (RF09) */}
        <Route path="/estudos/:id/candidatos/:candidatoId/elegibilidade" element={<ElegibilidadeCandidato />} />
        {/* Consentimento simulado (RF10) e inclusão como participante (RF11) */}
        <Route path="/estudos/:id/candidatos/:candidatoId/consentimento" element={<ConsentimentoCandidato />} />
        <Route path="/estudos/:id/candidatos/:candidatoId/inclusao" element={<InclusaoCandidato />} />
      </Route>

      {/* <-------------------ROTA NÃO ENCONTRADA-------------------> */}
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}