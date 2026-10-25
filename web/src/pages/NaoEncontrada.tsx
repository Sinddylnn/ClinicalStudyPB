import { Link } from 'react-router';

export default function NaoEncontrada() {
  return (
    <main>
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao início</Link>
    </main>
  );
}