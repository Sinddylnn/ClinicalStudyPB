import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import * as auth from '../../services/authService';
import type { Sessao } from '../../services/authService';

// Nenhum teste vai à rede: o serviço de autenticação é simulado
jest.mock('../../services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  consultarSessao: jest.fn(),
  definirAoExpirar: jest.fn(),
}));

const authMock = auth as jest.Mocked<typeof auth>;

const PARTICIPANTE: Sessao = {
  id: 1,
  nome: 'Maria Souza',
  email: 'maria.souza@exemplo.com',
  perfil: 'PARTICIPANTE',
};

const COORDENADOR: Sessao = {
  id: 2,
  nome: 'Carlos Coordenador',
  email: 'carlos.coordenador@exemplo.com',
  perfil: 'COORDENADOR',
};

// Monta o provider e espera a consulta de sessão da abertura terminar
async function montar() {
  const hook = await renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.restaurando).toBe(false));
  return hook;
}

describe('Sessão do participante (AuthProvider)', () => {
  beforeEach(() => {
    authMock.login.mockReset();
    authMock.logout.mockReset();
    authMock.consultarSessao.mockReset();
    authMock.consultarSessao.mockResolvedValue(null); // sem sessão ao abrir
    authMock.logout.mockResolvedValue(undefined);
  });

  it('guarda a sessão quando o perfil é participante', async () => {
    authMock.login.mockResolvedValue(PARTICIPANTE);
    const { result } = await montar();

    await act(async () => {
      await result.current.entrar('maria.souza@exemplo.com', 'senha-de-teste');
    });

    expect(result.current.autenticado).toBe(true);
    expect(result.current.sessao).toEqual(PARTICIPANTE);
    expect(result.current.aviso).toBeNull();
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('recusa a conta de outro perfil, encerra a sessão e mostra o aviso', async () => {
    authMock.login.mockResolvedValue(COORDENADOR);
    const { result } = await montar();

    await act(async () => {
      await result.current.entrar('carlos.coordenador@exemplo.com', 'senha-de-teste');
    });

    expect(result.current.autenticado).toBe(false);
    expect(result.current.sessao).toBeNull();
    expect(result.current.aviso).toBe('PERFIL_NAO_PARTICIPANTE');
    expect(authMock.logout).toHaveBeenCalledTimes(1);
  });

  it('não abre a sessão quando as credenciais são inválidas', async () => {
    authMock.login.mockRejectedValue(new Error('credenciais inválidas'));
    const { result } = await montar();

    await act(async () => {
      await expect(result.current.entrar('maria.souza@exemplo.com', 'errada')).rejects.toThrow();
    });

    expect(result.current.autenticado).toBe(false);
    expect(result.current.sessao).toBeNull();
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('volta ao login ao sair, mesmo se o servidor falhar', async () => {
    authMock.login.mockResolvedValue(PARTICIPANTE);
    const { result } = await montar();

    await act(async () => {
      await result.current.entrar('maria.souza@exemplo.com', 'senha-de-teste');
    });
    expect(result.current.autenticado).toBe(true);

    authMock.logout.mockRejectedValue(new Error('rede'));
    await act(async () => {
      await result.current.sair();
    });

    expect(result.current.autenticado).toBe(false);
    expect(result.current.sessao).toBeNull();
  });
});