import type { PerfilUsuario } from '../routes/RotaProtegida';
import './Avatar.css';

// <-------------------AVATAR COM INICIAIS------------------->
// "Paula Pesquisadora" → "PP"; a cor segue o perfil, como no protótipo
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export default function Avatar({ nome, perfil }: { nome: string; perfil: PerfilUsuario }) {
  return (
    <span className={`avatar avatar-${perfil.toLowerCase()}`} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}
