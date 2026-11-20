import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as auth from '@/services/authService';

jest.mock('@/services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  consultarSessao: jest.fn().mockResolvedValue(null),
  definirAoExpirar: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider: restrição ao participante (Task 3956)', () => {
  afterEach(() => jest.clearAllMocks());

  it('não autentica outro perfil, mostra o aviso e encerra a sessão', async () => {
    (auth.login as jest.Mock).mockResolvedValue({ perfil: 'COORDENADOR' });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restaurando).toBe(false));

    await act(() => result.current.entrar('coordenador@clinicalstudypb.test', 'Demo@123'));

    expect(result.current.autenticado).toBe(false);
    expect(result.current.aviso).toBe('PERFIL_NAO_PARTICIPANTE');
    expect(auth.logout).toHaveBeenCalled();
  });

  it('autentica o participante sem aviso', async () => {
    (auth.login as jest.Mock).mockResolvedValue({ perfil: 'PARTICIPANTE' });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restaurando).toBe(false));

    await act(() => result.current.entrar('participante@clinicalstudypb.test', 'Demo@123'));

    expect(result.current.autenticado).toBe(true);
    expect(result.current.aviso).toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('ao abrir o app, recusa sessão recuperada de outro perfil', async () => {
    (auth.consultarSessao as jest.Mock).mockResolvedValueOnce({ perfil: 'PESQUISADOR' });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restaurando).toBe(false));

    expect(result.current.autenticado).toBe(false);
    expect(result.current.aviso).toBe('PERFIL_NAO_PARTICIPANTE');
    expect(auth.logout).toHaveBeenCalled();
  });
});