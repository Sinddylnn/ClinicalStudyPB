import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('@/services/authService', () => ({
  CredenciaisInvalidasError: class CredenciaisInvalidasError extends Error {},
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

const mockUseAuth = useAuth as jest.Mock;

function configurarAuth(sobrescrever: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    entrar: jest.fn(),
    aviso: null,
    limparAviso: jest.fn(),
    ...sobrescrever,
  });
}

describe('Login: restrição ao participante e sessão encerrada (Task 3956)', () => {
  afterEach(() => jest.clearAllMocks());

  it('exibe a mensagem quando o perfil não é participante', async () => {
    configurarAuth({ aviso: 'PERFIL_NAO_PARTICIPANTE' });

    await render(<LoginScreen />);

    expect(screen.getByTestId('erro-login')).toBeTruthy();
    expect(
      screen.getByText('Este aplicativo é para participantes. Use o sistema web.')
    ).toBeTruthy();
  });

  it('exibe o aviso de sessão expirada', async () => {
    configurarAuth({ aviso: 'SESSAO_EXPIRADA' });

    await render(<LoginScreen />);

    expect(screen.getByTestId('aviso-sessao-expirada')).toBeTruthy();
    expect(
      screen.getByText('Sua sessão expirou após 30 minutos sem uso. Entre novamente.')
    ).toBeTruthy();
    expect(screen.queryByTestId('erro-login')).toBeNull();
  });

  it('não exibe aviso nem erro quando não há aviso', async () => {
    configurarAuth();

    await render(<LoginScreen />);

    expect(screen.queryByTestId('erro-login')).toBeNull();
    expect(screen.queryByTestId('aviso-sessao-expirada')).toBeNull();
  });

  it('chama entrar com e-mail e senha ao tocar em Entrar', async () => {
    const entrar = jest.fn().mockResolvedValue(undefined);
    configurarAuth({ entrar });

    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('campo-email'), 'pesquisador@teste.com');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), '123456');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() =>
      expect(entrar).toHaveBeenCalledWith('pesquisador@teste.com', '123456')
    );
  });

  it('mostra erro genérico quando e-mail ou senha estão vazios', async () => {
    const entrar = jest.fn();
    configurarAuth({ entrar });

    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() =>
      expect(
        screen.getByText('E-mail ou senha inválidos. Confira os dados e tente novamente.')
      ).toBeTruthy()
    );
    expect(entrar).not.toHaveBeenCalled();
  });
});