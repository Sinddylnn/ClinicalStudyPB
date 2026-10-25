import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import type { UsuarioSessao } from '../api/sessaoSimulada';
import type { PerfilUsuario } from '../routes/RotaProtegida';
import Avatar from './Avatar';
import Icone, { type NomeIcone } from './icones';
import './BarraNavegacao.css';

type ItemMenu = { rotulo: string; destino: string; icone: NomeIcone };

// <-------------------MENU POR PERFIL------------------->
// Mesmos itens das barras do protótipo para cada perfil
const MENUS: Record<PerfilUsuario, ItemMenu[]> = {
  ADMINISTRADOR: [{ rotulo: 'Usuários', destino: '/usuarios', icone: 'usuarios' }],
  PESQUISADOR: [{ rotulo: 'Meus estudos', destino: '/estudos', icone: 'frasco' }],
  COORDENADOR: [{ rotulo: 'Estudos', destino: '/estudos', icone: 'frasco' }],
  PARTICIPANTE: [],
};

const NOMES_PERFIL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  PESQUISADOR: 'Pesquisador',
  COORDENADOR: 'Coordenador',
  PARTICIPANTE: 'Participante',
};

// <-------------------BARRA DE NAVEGAÇÃO------------------->
export default function BarraNavegacao({ usuario }: { usuario: UsuarioSessao }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const conta = useRef<HTMLDivElement>(null);

  // Clique fora ou Esc fecha o menu da conta, como na nota do protótipo
  useEffect(() => {
    if (!menuAberto) return;
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (!conta.current?.contains(evento.target as Node)) setMenuAberto(false);
    };
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false);
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [menuAberto]);

  const itens: ItemMenu[] = [{ rotulo: 'Início', destino: '/', icone: 'casa' }, ...MENUS[usuario.perfil]];

  return (
    <header className="barra-navegacao">
      <Link className="barra-marca" to="/">
        <span className="barra-logo">
          <Icone nome="frasco" />
        </span>
        ClinicalStudyPB
      </Link>

      <nav className="barra-menu" aria-label="Menu principal">
        {itens.map((item) => (
          // Só "Início" exige rota exata; "Meus estudos" segue ativo em /estudos/novo
          <NavLink key={item.destino} to={item.destino} end={item.destino === '/'} className="barra-item">
            <Icone nome={item.icone} />
            {item.rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="barra-conta" ref={conta}>
        <button
          type="button"
          className="barra-conta-botao"
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span className="barra-conta-texto">
            <span className="barra-conta-nome">{usuario.nome}</span>
            <span className="barra-conta-perfil">{NOMES_PERFIL[usuario.perfil]}</span>
          </span>
          <Avatar nome={usuario.nome} perfil={usuario.perfil} />
          <Icone nome="setaBaixo" tamanho={16} />
        </button>

        {menuAberto && (
          <div className="barra-conta-menu" role="menu">
            <div className="barra-conta-identificacao">
              <Avatar nome={usuario.nome} perfil={usuario.perfil} />
              <span>
                <span className="barra-conta-menu-nome">{usuario.nome}</span>
                <span className="barra-conta-menu-email">{usuario.email}</span>
              </span>
            </div>
            {/* O encerramento da sessão (POST /auth/logout) entra na T13 */}
            <Link className="barra-conta-sair" role="menuitem" to="/login">
              <Icone nome="sair" />
              Sair
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
