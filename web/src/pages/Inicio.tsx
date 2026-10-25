import { Link } from 'react-router';
import { useUsuarioLogado } from '../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../components/BarraNavegacao';

// Fica dentro da RotaProtegida: a barra mostra quem está logado e dá acesso ao Sair
export default function Inicio() {
  const usuario = useUsuarioLogado();

  return (
    <>
      <BarraNavegacao usuario={usuario} />
      <main>
        <h1>ClinicalStudyPB</h1>
        <nav>
          <Link to="/usuarios">Usuários</Link> | <Link to="/estudos">Estudos</Link>
        </nav>
      </main>
    </>
  );
}
