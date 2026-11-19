import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as auth from '../services/authService';
import type { Sessao } from '../services/authService';

export type Aviso = 'SESSAO_EXPIRADA' | 'PERFIL_NAO_PARTICIPANTE';

type AuthContextValue = {
  sessao: Sessao | null;
  autenticado: boolean;
  restaurando: boolean;
  aviso: Aviso | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  limparAviso: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [restaurando, setRestaurando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const sessaoRef = useRef<Sessao | null>(null);
  sessaoRef.current = sessao;

  // Só participantes usam o app: qualquer outro perfil tem a sessão encerrada
  const aceitar = useCallback(async (nova: Sessao) => {
    if (nova.perfil !== 'PARTICIPANTE') {
      try {
        await auth.logout();
      } catch {
        // a sessão no servidor expira sozinha
      }
      setSessao(null);
      setAviso('PERFIL_NAO_PARTICIPANTE');
      return;
    }
    setAviso(null);
    setSessao(nova);
  }, []);

  // Sessão expirada com o app aberto: volta ao login com aviso
  const expirar = useCallback(() => {
    if (!sessaoRef.current) return;
    setSessao(null);
    setAviso('SESSAO_EXPIRADA');
  }, []);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      await aceitar(await auth.login(email, senha));
    },
    [aceitar]
  );

  // O app sempre volta ao login, mesmo que a chamada ao servidor falhe.
  const sair = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // a sessão no servidor expira sozinha após o tempo de inatividade
    } finally {
      setAviso(null);
      setSessao(null);
    }
  }, []);

  const limparAviso = useCallback(() => setAviso(null), []);

  // Qualquer requisição autenticada que devolver 401 chama expirar()
  useEffect(() => {
    auth.definirAoExpirar(expirar);
    return () => auth.definirAoExpirar(null);
  }, [expirar]);

  // Ao abrir o app: se o servidor ainda tem a sessão, entra direto
  useEffect(() => {
    let ativo = true;
    auth
      .consultarSessao()
      .then((atual) => {
        if (ativo && atual) return aceitar(atual);
      })
      .catch(() => {
        // sem conexão: mostra o login
      })
      .finally(() => {
        if (ativo) setRestaurando(false);
      });
    return () => {
      ativo = false;
    };
  }, [aceitar]);

  // Ao voltar para o app: confere se a sessão ainda existe no servidor
  useEffect(() => {
    if (!sessao) return;
    const inscricao = AppState.addEventListener('change', async (estado) => {
      if (estado !== 'active') return;
      try {
        if ((await auth.consultarSessao()) === null) expirar();
      } catch {
        // sem conexão: mantém a sessão
      }
    });
    return () => inscricao.remove();
  }, [sessao, expirar]);

  const value = useMemo(
    () => ({
      sessao,
      autenticado: sessao !== null,
      restaurando,
      aviso,
      entrar,
      sair,
      limparAviso,
    }),
    [sessao, restaurando, aviso, entrar, sair, limparAviso]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
