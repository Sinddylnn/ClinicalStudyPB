import type { PerfilUsuario } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';

// <-------------------REGRAS DO FORMULÁRIO DE USUÁRIO------------------->
// A web valida antes de enviar, com os textos do protótipo; o backend continua validando.

export type CampoUsuario = 'nome' | 'email' | 'senha' | 'perfil';

export type DadosUsuario = {
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario | '';
};

export type ErrosUsuario = Partial<Record<CampoUsuario, string>>;

// Mínimo do protótipo. O backend ainda NÃO exige tamanho mínimo de senha (só o máximo de
// 72 bytes, SENHA_MUITO_LONGA): falta combinar com o Luiz para ele validar também.
export const SENHA_MINIMA = 8;

// Formato básico nome@dominio.tld; o @Email do backend é a palavra final
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Confere os campos. Na edição a senha não existe e não é validada. */
export function validarUsuario(dados: DadosUsuario, comSenha: boolean): ErrosUsuario {
  const erros: ErrosUsuario = {};
  if (!dados.nome.trim()) erros.nome = 'Informe o nome completo.';
  if (!EMAIL.test(dados.email.trim())) erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  if (comSenha && dados.senha.length < SENHA_MINIMA) {
    erros.senha = `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  if (!dados.perfil) erros.perfil = 'Selecione um perfil.';
  return erros;
}

// <-------------------ERROS DO BACKEND------------------->
/** Faixa do protótipo quando há erro em algum campo. */
export const MENSAGEM_CAMPOS_DESTACADOS = 'Não foi possível salvar. Confira os campos destacados.';

const CAMPOS: CampoUsuario[] = ['nome', 'email', 'senha', 'perfil'];

// Códigos de regra que pertencem a um campo do formulário
const CAMPO_DO_CODIGO: Partial<Record<string, CampoUsuario>> = {
  EMAIL_JA_CADASTRADO: 'email',
  SENHA_MUITO_LONGA: 'senha',
  ULTIMO_ADMINISTRADOR: 'perfil',
  PERFIL_COM_VINCULOS: 'perfil',
};

/**
 * Converte a falha do POST/PUT em erros por campo e na mensagem da faixa.
 * A mensagem de cada regra é a do backend (erro.message).
 */
export function errosDoServidor(erro: unknown): { erros: ErrosUsuario; erroGeral: string } {
  if (!(erro instanceof ErroRequisicao)) {
    return { erros: {}, erroGeral: 'Não foi possível salvar o usuário.' };
  }

  if (erro.codigo === 'VALIDACAO_INVALIDA') {
    const erros = Object.fromEntries(
      Object.entries(erro.errosCampos).filter(([campo]) => (CAMPOS as string[]).includes(campo)),
    ) as ErrosUsuario;
    // Sem erro em campo da tela, a mensagem do backend evita uma recusa silenciosa
    const temCampo = Object.keys(erros).length > 0;
    return { erros, erroGeral: temCampo ? MENSAGEM_CAMPOS_DESTACADOS : erro.message };
  }

  const campo = CAMPO_DO_CODIGO[erro.codigo];
  if (campo) return { erros: { [campo]: erro.message }, erroGeral: MENSAGEM_CAMPOS_DESTACADOS };

  return { erros: {}, erroGeral: erro.message };
}
