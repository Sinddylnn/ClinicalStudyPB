import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { PerfilUsuario, UsuarioSessao } from '../api/autenticacao';
import { ContextoAutenticacao, type Autenticacao } from '../autenticacao/contextoAutenticacao';
import { formatarHoje } from './formatacaoInicio';
import Inicio from './Inicio';

// <-------------------SIMULAÇÕES------------------->
function usuarioCom(perfil: PerfilUsuario, nome: string): UsuarioSessao {
  return { id: 1, nome, email: 'conta@exemplo.com', perfil };
}

function renderizarCom(usuario: UsuarioSessao) {
  const autenticacao: Autenticacao = {
    usuario,
    carregando: false,
    avisoSessao: null,
    saidaVoluntaria: false,
    entrar: async () => undefined,
    sair: async () => undefined,
    atualizarSessao: async () => undefined,
  };
  render(
    <MemoryRouter>
      <ContextoAutenticacao.Provider value={autenticacao}>
        <Inicio />
      </ContextoAutenticacao.Provider>
    </MemoryRouter>,
  );
}

function atalhos() {
  const secao = screen.getByRole('region', { name: 'Ações rápidas' });
  return within(secao)
    .queryAllByRole('link')
    .map((link) => [link.querySelector('.inicio-atalho-titulo')?.textContent, link.getAttribute('href')]);
}

// <-------------------TESTES DO INÍCIO------------------->
describe('Início', () => {
  it('cumprimenta pelo primeiro nome, com a data de hoje', () => {
    renderizarCom(usuarioCom('PESQUISADOR', 'Paula Pesquisadora'));
    expect(screen.getByRole('heading', { name: 'Olá, Paula' })).toBeInTheDocument();
    expect(
      screen.getByText(`${formatarHoje(new Date())} • Estudos sob sua responsabilidade`),
    ).toBeInTheDocument();
  });

  it('mostra ao pesquisador os atalhos de cadastrar e ver estudos', () => {
    renderizarCom(usuarioCom('PESQUISADOR', 'Paula Pesquisadora'));
    expect(atalhos()).toEqual([
      ['Cadastrar estudo', '/estudos/novo'],
      ['Ver meus estudos', '/estudos'],
    ]);
  });

  it('mostra ao coordenador só a consulta dos estudos', () => {
    renderizarCom(usuarioCom('COORDENADOR', 'Carlos Coordenador'));
    expect(screen.getByText(/Acompanhamento dos estudos vinculados a você/)).toBeInTheDocument();
    expect(atalhos()).toEqual([['Ver estudos', '/estudos']]);
  });

  it('mostra ao administrador os atalhos de usuários', () => {
    renderizarCom(usuarioCom('ADMINISTRADOR', 'Ana Administradora'));
    expect(screen.getByText(/Painel do administrador/)).toBeInTheDocument();
    expect(atalhos()).toEqual([
      ['Cadastrar usuário', '/usuarios/novo'],
      ['Gerenciar usuários', '/usuarios'],
    ]);
  });

  it('avisa o participante que o acompanhamento é pelo aplicativo, sem atalhos', () => {
    renderizarCom(usuarioCom('PARTICIPANTE', 'Maria Souza'));
    expect(atalhos()).toEqual([]);
    expect(screen.getByText(/ficam no aplicativo/)).toBeInTheDocument();
  });

  it('formata a data com o dia da semana em maiúscula', () => {
    expect(formatarHoje(new Date(2026, 9, 23))).toBe('Sexta-feira, 23 de outubro de 2026');
  });
});
