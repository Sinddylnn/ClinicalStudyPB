import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../app/login';
import { useAuth } from '../../contexts/AuthContext';
import { CredenciaisInvalidasError } from '../../services/authService';

// Fontes não existem no ambiente de teste (mesmo mock dos outros testes)
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

// Sem SafeAreaProvider no teste: as margens seguras valem zero
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Cada teste define o que o contexto devolve
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;

const MSG_CREDENCIAIS = 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
const MSG_FALHA = 'Não foi possível entrar agora. Tente novamente.';
const MSG_PERFIL = 'Este aplicativo é exclusivo para participantes.';
const MSG_SESSAO_EXPIRADA = 'Sua sessão expirou após 30 minutos sem uso. Entre novamente.';

function prepararAuth(extra: Partial<ReturnType<typeof useAuth>> = {}) {
  const auth: ReturnType<typeof useAuth> = {
    sessao: null,
    autenticado: false,
    restaurando: false,
    aviso: null,
    entrar: jest.fn().mockResolvedValue(undefined),
    sair: jest.fn(),
    limparAviso: jest.fn(),
    ...extra,
  };
  useAuthMock.mockReturnValue(auth);
  return auth;
}

async function preencher(email: string, senha: string) {
  await fireEvent.changeText(screen.getByTestId('campo-email'), email);
  await fireEvent.changeText(screen.getByTestId('campo-senha'), senha);
}

describe('Tela de login', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('exibe os campos de e-mail e senha e o botão Entrar', async () => {
    prepararAuth();
    await render(<LoginScreen />);

    expect(screen.getByText('Entrar na sua conta')).toBeTruthy();
    expect(screen.getByTestId('campo-email')).toBeTruthy();
    expect(screen.getByTestId('campo-senha')).toBeTruthy();
    expect(screen.getByTestId('botao-entrar')).toBeTruthy();
    expect(screen.queryByTestId('erro-login')).toBeNull();
  });

  it('mostra o aviso de credenciais inválidas com os campos vazios, sem chamar a API', async () => {
    const auth = prepararAuth();
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('botao-entrar'));

    expect(await screen.findByText(MSG_CREDENCIAIS)).toBeTruthy();
    expect(auth.entrar).not.toHaveBeenCalled();
  });

  it('envia o e-mail sem espaços e a senha ao entrar', async () => {
    const auth = prepararAuth();
    await render(<LoginScreen />);

    await preencher('  maria.souza@exemplo.com  ', 'senha-de-teste');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() =>
      expect(auth.entrar).toHaveBeenCalledWith('maria.souza@exemplo.com', 'senha-de-teste')
    );
    expect(screen.queryByTestId('erro-login')).toBeNull();
  });

  it('mostra o aviso de credenciais inválidas quando a API recusa o login', async () => {
    prepararAuth({
      entrar: jest.fn().mockRejectedValue(new CredenciaisInvalidasError()),
    });
    await render(<LoginScreen />);

    await preencher('maria.souza@exemplo.com', 'senha-errada');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    expect(await screen.findByText(MSG_CREDENCIAIS)).toBeTruthy();
    expect(screen.getByTestId('erro-login')).toBeTruthy();
  });

  it('mostra o aviso de falha quando a conexão com a API falha', async () => {
    prepararAuth({
      entrar: jest.fn().mockRejectedValue(new Error('rede')),
    });
    await render(<LoginScreen />);

    await preencher('maria.souza@exemplo.com', 'senha-de-teste');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    expect(await screen.findByText(MSG_FALHA)).toBeTruthy();
    expect(screen.queryByText(MSG_CREDENCIAIS)).toBeNull();
  });

  it('mostra o aviso quando a conta é de outro perfil', async () => {
    prepararAuth({ aviso: 'PERFIL_NAO_PARTICIPANTE' });
    await render(<LoginScreen />);

    expect(await screen.findByText(MSG_PERFIL)).toBeTruthy();
    expect(screen.getByTestId('erro-login')).toBeTruthy();
  });

  it('mostra o aviso quando a sessão expirou', async () => {
    prepararAuth({ aviso: 'SESSAO_EXPIRADA' });
    await render(<LoginScreen />);

    expect(await screen.findByText(MSG_SESSAO_EXPIRADA)).toBeTruthy();
    expect(screen.getByTestId('aviso-sessao-expirada')).toBeTruthy();
    expect(screen.queryByTestId('erro-login')).toBeNull();
  });
});