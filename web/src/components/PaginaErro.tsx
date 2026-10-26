import { Link } from 'react-router';
import { useAutenticacao } from '../autenticacao/contextoAutenticacao';
import BarraNavegacao from './BarraNavegacao';
import Icone, { type NomeIcone } from './icones';
import '../estilos/comum.css';
import './PaginaErro.css';

type Props = {
  /** Texto da etiqueta, como "Erro 403". */
  codigo: string;
  titulo: string;
  mensagem: string;
  icone: NomeIcone;
  tom: 'perigo' | 'neutro';
};

// <-------------------PÁGINA DE ERRO------------------->
// Base do quadro "Acesso negado (403)" do protótipo, também usada na rota não encontrada.
// As rotas de erro são públicas: a barra só aparece para quem está logado.
export default function PaginaErro({ codigo, titulo, mensagem, icone, tom }: Props) {
  const { usuario } = useAutenticacao();

  return (
    <div className="pagina-interna pagina-erro">
      {usuario && <BarraNavegacao usuario={usuario} />}

      <main className="pagina-erro-conteudo">
        <nav className="trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">{titulo}</span>
        </nav>

        <section className={`pagina-erro-cartao pagina-erro-${tom}`}>
          <span className="pagina-erro-icone">
            <Icone nome={icone} tamanho={34} />
          </span>
          <span className="etiqueta pagina-erro-etiqueta">{codigo}</span>
          <h1>{titulo}</h1>
          <p>{mensagem}</p>
          <Link className="botao botao-primario" to="/">
            <Icone nome="casa" />
            Voltar ao início
          </Link>
        </section>
      </main>
    </div>
  );
}
