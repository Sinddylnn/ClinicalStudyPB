import { Link } from 'react-router';
import type { PerfilUsuario } from '../api/autenticacao';
import { useUsuarioLogado } from '../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../components/BarraNavegacao';
import Icone, { type NomeIcone } from '../components/icones';
import { formatarHoje } from './formatacaoInicio';
import '../estilos/comum.css';
import './inicio.css';

type Atalho = {
  titulo: string;
  descricao: string;
  destino: string;
  icone: NomeIcone;
  tom: 'primario' | 'azul';
};

type Painel = {
  /** Depois da data, no subtítulo da página. */
  resumo: string;
  /** Abaixo de "Ações rápidas". */
  subtitulo: string;
  atalhos: Atalho[];
};

// <-------------------PAINEL DE CADA PERFIL------------------->
// Textos dos quadros "Início" do protótipo; o Início só tem atalhos
const PAINEIS: Record<PerfilUsuario, Painel> = {
  ADMINISTRADOR: {
    resumo: 'Painel do administrador',
    subtitulo: 'Atalhos para as tarefas mais comuns',
    atalhos: [
      {
        titulo: 'Cadastrar usuário',
        descricao: 'Crie contas para pesquisadores, coordenadores, participantes ou administradores.',
        destino: '/usuarios/novo',
        icone: 'usuarioMais',
        tom: 'primario',
      },
      {
        titulo: 'Gerenciar usuários',
        descricao: 'Edite dados e perfis, desative ou reative contas.',
        destino: '/usuarios',
        icone: 'usuarios',
        tom: 'azul',
      },
    ],
  },
  PESQUISADOR: {
    resumo: 'Estudos sob sua responsabilidade',
    subtitulo: 'Comece por aqui',
    atalhos: [
      {
        titulo: 'Cadastrar estudo',
        descricao: 'Título, objetivo, período e limite de participantes.',
        destino: '/estudos/novo',
        icone: 'mais',
        tom: 'primario',
      },
      {
        titulo: 'Ver meus estudos',
        descricao: 'Consulte os estudos sob sua responsabilidade.',
        destino: '/estudos',
        icone: 'frasco',
        tom: 'azul',
      },
    ],
  },
  COORDENADOR: {
    resumo: 'Acompanhamento dos estudos vinculados a você',
    subtitulo: 'Acompanhamento dos estudos',
    atalhos: [
      {
        titulo: 'Ver estudos',
        descricao: 'Estudos vinculados a você e o recrutamento de candidatos.',
        destino: '/estudos',
        icone: 'frasco',
        tom: 'primario',
      },
    ],
  },
  // O participante usa o aplicativo; na web não há ações para ele
  PARTICIPANTE: {
    resumo: 'Participação em estudos',
    subtitulo: 'Sua participação é acompanhada pelo aplicativo',
    atalhos: [],
  },
};

// <-------------------INÍCIO------------------->
// Fica dentro da RotaProtegida: cada perfil vê só os atalhos das rotas que pode abrir
export default function Inicio() {
  const usuario = useUsuarioLogado();
  const painel = PAINEIS[usuario.perfil];
  const primeiroNome = usuario.nome.trim().split(/\s+/)[0];

  return (
    <div className="pagina-interna inicio-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="inicio-conteudo">
        <nav className="trilha" aria-label="Trilha de navegação">
          <span aria-current="page">Início</span>
        </nav>

        <header className="inicio-cabecalho">
          <h1>Olá, {primeiroNome}</h1>
          <p className="inicio-subtitulo">
            {formatarHoje(new Date())} • {painel.resumo}
          </p>
        </header>

        <section className="inicio-cartao" aria-labelledby="inicio-acoes">
          <header>
            <h2 id="inicio-acoes">Ações rápidas</h2>
            <p>{painel.subtitulo}</p>
          </header>

          {painel.atalhos.length > 0 ? (
            <ul className={`inicio-atalhos ${painel.atalhos.length === 1 ? 'inicio-atalhos-unico' : ''}`}>
              {painel.atalhos.map((atalho) => (
                <li key={atalho.destino}>
                  <Link className="inicio-atalho" to={atalho.destino}>
                    <span className={`inicio-atalho-icone inicio-tom-${atalho.tom}`}>
                      <Icone nome={atalho.icone} tamanho={20} />
                    </span>
                    <span className="inicio-atalho-texto">
                      <span className="inicio-atalho-titulo">{atalho.titulo}</span>
                      <span className="inicio-atalho-descricao">{atalho.descricao}</span>
                    </span>
                    <Icone nome="setaDireita" className="inicio-atalho-seta" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              Os estudos, termos e registros do participante ficam no aplicativo. A versão web não tem ações
              para o seu perfil.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
