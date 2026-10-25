import { Link } from 'react-router';

export default function Inicio() {
  return (
    <main>
      <h1>ClinicalStudyPB</h1>
      <nav>
        <Link to="/usuarios">Usuários</Link> | <Link to="/estudos">Estudos</Link>
      </nav>
    </main>
  );
}