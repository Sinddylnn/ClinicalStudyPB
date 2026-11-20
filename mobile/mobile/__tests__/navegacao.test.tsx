import { describe, it, expect, jest } from '@jest/globals';
import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';

// Fontes e splash screen não existem no ambiente de teste
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Simula um participante já logado: com as rotas protegidas, o app abriria no login
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    sessao: { id: 1, nome: 'Maria Souza', email: 'maria.souza@exemplo.com', perfil: 'PARTICIPANTE' },
    autenticado: true,
    entrar: jest.fn(),
    sair: jest.fn(),
  }),
}));

// A aba Estudos consulta a API: nos testes de navegação ela devolve lista vazia
jest.mock('../../services/participanteService', () => ({
  listarEstudos: jest.fn(async () => []),
}));

// A primeira execução compila o app inteiro e pode passar de 5 segundos
jest.setTimeout(30000);

// A primeira execução compila o app inteiro e pode passar de 5 segundos
jest.setTimeout(30000);

const APP = './app';

describe('Estrutura inicial do app (Sprint 1)', () => {
  it('exibe os elementos principais da tela Início', async () => {
    await renderRouter(APP);

    expect(screen.getByText('ClinicalStudyPB')).toBeTruthy();
    expect(screen.getByText('Olá!')).toBeTruthy();
    expect(screen.getByText('Aplicativo do participante')).toBeTruthy();
    expect(screen.getByText('Disponível na Sprint 3')).toBeTruthy();
  });

  it('exibe os quatro botões da barra de navegação', async () => {
    await renderRouter(APP);

    ['Início', 'Estudos', 'Visitas', 'Perfil'].forEach((rotulo) => {
      expect(screen.getByText(rotulo)).toBeTruthy();
    });
  });

  it('navega para a tela Meus estudos', async () => {
    await renderRouter(APP);

    await fireEvent.press(screen.getByText('Estudos'));

    expect(screen.getByText('Meus estudos')).toBeTruthy();
    expect(screen.getByText('Estudos em que você está incluída')).toBeTruthy();
  });

  it('navega para a tela Visitas', async () => {
    await renderRouter(APP);

    await fireEvent.press(screen.getByText('Visitas'));

    expect(screen.getByText('Próximas visitas e comparecimento')).toBeTruthy();
  });

  it('navega para a tela Perfil', async () => {
    await renderRouter(APP);

    await fireEvent.press(screen.getByText('Perfil'));

    expect(screen.getByText('Dados da sua conta')).toBeTruthy();
  });

  it('volta para a tela Início depois de navegar para outra aba', async () => {
    await renderRouter(APP);

    await fireEvent.press(screen.getByText('Estudos'));
    expect(screen.getByText('Meus estudos')).toBeTruthy();

    await fireEvent.press(screen.getByText('Início'));
    expect(screen.getByText('Olá!')).toBeTruthy();
  });
});