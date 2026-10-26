import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { login, logout, sessaoAtual, type UsuarioSessao } from '../api/autenticacao';
import { registrarTratadoresSessao } from '../api/cliente';
import { ErroRequisicao } from '../api/erros';
import { ContextoAutenticacao, type Autenticacao, type AvisoSessao } from './contextoAutenticacao';

// <-------------------PROVEDOR DE AUTENTICAÇÃO------------------->
// Guarda quem está logado. A segurança real é do backend: aqui só se organiza a navegação.
export default function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const local = useLocation();
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [avisoSessao, setAvisoSessao] = useState<AvisoSessao | null>(null);
  const [saidaVoluntaria, setSaidaVoluntaria] = useState(false);

  // Lidos pelos tratadores do cliente, chamados fora do ciclo de renderização
  const usuarioAtual = useRef<UsuarioSessao | null>(null);
  const saindo = useRef(false);
  const revalidando = useRef(false);
  // A sessão acabou de ser confirmada pelo login: a próxima troca de rota não revalida
  const acabouDeEntrar = useRef(false);
  // Muda a cada entrar/sair: uma revalidação iniciada antes disso é descartada
  const geracaoSessao = useRef(0);
  useEffect(() => {
    usuarioAtual.current = usuario;
  }, [usuario]);

  // 401 com alguém logado é sessão expirada. Pode ser chamada duas vezes para o mesmo 401
  // (tratador do cliente e revalidação): o resultado é o mesmo
  const encerrarSessaoExpirada = useCallback(() => {
    if (saindo.current) return; // o logout trata o próprio 401
    // Só avisa quem estava logado; o primeiro acesso sem sessão não é expiração
    if (usuarioAtual.current) setAvisoSessao('sessaoExpirada');
    setUsuario(null);
  }, []);

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
      naoAutenticado: encerrarSessaoExpirada,
      acessoNegado: () => navigate('/acesso-negado'),
    });
    return () => registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
  }, [navigate, encerrarSessaoExpirada]);

  // <-------------------REVALIDAÇÃO DA SESSÃO------------------->
  // Telas que não chamam a API não recebem 401: sem isso, quem teve a sessão encerrada
  // (cookie apagado, expiração, conta desativada) seguiria navegando até recarregar.
  // Só 401 desloga; outra falha (ex.: SEM_CONEXAO) é momentânea e mantém o usuário.
  const revalidarSessao = useCallback(async () => {
    if (!usuarioAtual.current || revalidando.current || saindo.current) return;
    revalidando.current = true;
    const geracao = geracaoSessao.current;
    try {
      const encontrado = await sessaoAtual();
      if (encontrado === null && geracao === geracaoSessao.current) encerrarSessaoExpirada();
    } catch {
      // Falha momentânea: a próxima troca de rota tenta de novo
    } finally {
      revalidando.current = false;
    }
  }, [encerrarSessaoExpirada]);

  // A cada troca de rota. A primeira carga já consultou a sessão (e ainda não há usuário)
  useEffect(() => {
    if (acabouDeEntrar.current) {
      acabouDeEntrar.current = false;
      return;
    }
    if (local.pathname === '/login') return;
    void revalidarSessao();
  }, [local.key, local.pathname, revalidarSessao]);

  // Quando a aba volta a ficar visível
  useEffect(() => {
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') void revalidarSessao();
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [revalidarSessao]);

  // <-------------------ENTRAR E SAIR------------------->
  const entrar = useCallback(async (email: string, senha: string) => {
    const logado = await login(email, senha);
    geracaoSessao.current += 1;
    acabouDeEntrar.current = true;
    setAvisoSessao(null);
    setSaidaVoluntaria(false);
    setUsuario(logado);
  }, []);

  // A sessão só é limpa na tela quando o servidor a invalidou (204) ou ela já não existia (401).
  // saidaVoluntaria muda no mesmo render que o usuário: a RotaProtegida não guarda a página
  // de quem saiu, e a próxima pessoa a entrar vai para "/"
  const sair = useCallback(async () => {
    saindo.current = true;
    geracaoSessao.current += 1;
    try {
      await logout();
    } catch (erro) {
      if (!(erro instanceof ErroRequisicao && erro.status === 401)) throw erro;
    } finally {
      saindo.current = false;
    }
    setSaidaVoluntaria(true);
    setUsuario(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const valor = useMemo<Autenticacao>(
    () => ({ usuario, carregando, avisoSessao, saidaVoluntaria, entrar, sair }),
    [usuario, carregando, avisoSessao, saidaVoluntaria, entrar, sair],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}
