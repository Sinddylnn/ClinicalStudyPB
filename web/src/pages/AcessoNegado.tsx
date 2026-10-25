import { Link } from 'react-router';

export default function AcessoNegado() {
  return (
    <main>
      <h1>Acesso negado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
      <Link to="/">Voltar ao início</Link>
    </main>
  );
}