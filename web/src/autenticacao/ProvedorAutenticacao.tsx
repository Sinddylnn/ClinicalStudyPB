import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { login, logout, sessaoAtual, type UsuarioSessao } from '../api/autenticacao';
import { registrarTratadoresSessao } from '../api/cliente';
import { ErroRequisicao } from '../api/erros';
import { ContextoAutenticacao, type Autenticacao, type AvisoSessao } from './contextoAutenticacao';

// <-------------------PROVEDOR DE AUTENTICAÇÃO------------------->
// Guarda quem está logado. A segurança real é do backend: aqui só se organiza a navegação.
export default function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [avisoSessao, setAvisoSessao] = useState<AvisoSessao | null>(null);

  // Lidos pelos tratadores do cliente, chamados fora do ciclo de renderização
  const usuarioAtual = useRef<UsuarioSessao | null>(null);
  const saindo = useRef(false);
  useEffect(() => {
    usuarioAtual.current = usuario;
  }, [usuario]);

  // <-------------------SESSÃO AO ABRIR A PÁGINA------------------->
  // Recupera a identificação após recarregar. 401 já vira null em sessaoAtual();
  // outra falha (ex.: SEM_CONEXAO) também leva ao login, mas com aviso
  useEffect(() => {
    let ativo = true;
    sessaoAtual()
      .catch(() => {
        if (ativo) setAvisoSessao('falhaVerificacao');
        return null;
      })
      .then((encontrado) => {
        if (!ativo) return;
        setUsuario(encontrado);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // <-------------------TRATADORES DO CLIENTE HTTP------------------->
  // 401: limpa o usuário e a RotaProtegida leva ao /login guardando a página atual.
  // 403 ACESSO_NEGADO: leva à tela de acesso negado.
  useEffect(() => {
    registrarTratadoresSessao({
      naoAutenticado: () => {
        if (saindo.current) return; // o logout trata o próprio 401
        // Só avisa quem estava logado; o primeiro acesso sem sessão não é expiração
        if (usuarioAtual.current) setAvisoSessao('sessaoExpirada');
        setUsuario(null);
      },
      acessoNegado: () => navigate('/acesso-negado'),
    });
    return () => registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
  }, [navigate]);

  // <-------------------ENTRAR E SAIR------------------->
  const entrar = useCallback(async (email: string, senha: string) => {
    const logado = await login(email, senha);
    setAvisoSessao(null);
    setUsuario(logado);
  }, []);

  // A sessão só é limpa na tela quando o servidor a invalidou (204) ou ela já não existia (401)
  const sair = useCallback(async () => {
    saindo.current = true;
    try {
      await logout();
    } catch (erro) {
      if (!(erro instanceof ErroRequisicao && erro.status === 401)) throw erro;
    } finally {
      saindo.current = false;
    }
    setUsuario(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const valor = useMemo<Autenticacao>(
    () => ({ usuario, carregando, avisoSessao, entrar, sair }),
    [usuario, carregando, avisoSessao, entrar, sair],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}
