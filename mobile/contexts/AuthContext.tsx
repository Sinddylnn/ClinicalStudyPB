import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as auth from '../services/authService';
import type { Sessao } from '../services/authService';

type AuthContextValue = {
  sessao: Sessao | null;
  autenticado: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);

  const entrar = useCallback(async (email: string, senha: string) => {
    setSessao(await auth.login(email, senha));
  }, []);

  // O app sempre volta ao login, mesmo que a chamada ao servidor falhe.
  const sair = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // a sessão no servidor expira sozinha após o tempo de inatividade
    } finally {
      setSessao(null);
    }
  }, []);

  const value = useMemo(
    () => ({ sessao, autenticado: sessao !== null, entrar, sair }),
    [sessao, entrar, sair]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
