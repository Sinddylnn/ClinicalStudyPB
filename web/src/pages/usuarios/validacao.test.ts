import { describe, expect, it } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import { errosDoServidor, MENSAGEM_CAMPOS_DESTACADOS, validarUsuario, type DadosUsuario } from './validacao';

// <-------------------TESTES DA VALIDAÇÃO DE USUÁRIO------------------->
const VALIDO: DadosUsuario = {
  nome: 'Maria Souza',
  email: 'maria.souza@exemplo.com',
  senha: 'Senha123',
  perfil: 'PARTICIPANTE',
};

describe('validarUsuario', () => {
  it('aceita dados completos', () => {
    expect(validarUsuario(VALIDO, true)).toEqual({});
  });

  it('usa as mensagens do protótipo para campos vazios ou inválidos', () => {
    expect(validarUsuario({ nome: '  ', email: 'paula.souza@', senha: '12345', perfil: '' }, true)).toEqual({
      nome: 'Informe o nome completo.',
      email: 'Informe um e-mail válido, como nome@exemplo.com.',
      senha: 'A senha deve ter pelo menos 8 caracteres.',
      perfil: 'Selecione um perfil.',
    });
  });

  it('aceita e-mail com espaços nas pontas (o backend os remove)', () => {
    expect(validarUsuario({ ...VALIDO, email: '  maria@exemplo.com ' }, true)).toEqual({});
  });

  it('não valida a senha na edição', () => {
    expect(validarUsuario({ ...VALIDO, senha: '' }, false)).toEqual({});
  });
});

describe('errosDoServidor', () => {
  const erro = (codigo: string, mensagem: string, errosCampos?: Record<string, string>) =>
    new ErroRequisicao(400, { codigo, mensagem, errosCampos });

  it('leva os errosCampos conhecidos para os campos', () => {
    expect(
      errosDoServidor(
        erro('VALIDACAO_INVALIDA', 'Confira os campos informados.', {
          email: 'O e-mail informado é inválido.',
          outro: 'ignorado',
        }),
      ),
    ).toEqual({ erros: { email: 'O e-mail informado é inválido.' }, erroGeral: MENSAGEM_CAMPOS_DESTACADOS });
  });

  it('mostra a mensagem do backend quando a validação não aponta campo da tela', () => {
    expect(errosDoServidor(erro('VALIDACAO_INVALIDA', 'Confira os campos informados.'))).toEqual({
      erros: {},
      erroGeral: 'Confira os campos informados.',
    });
  });

  it.each([
    ['EMAIL_JA_CADASTRADO', 'email'],
    ['SENHA_MUITO_LONGA', 'senha'],
    ['ULTIMO_ADMINISTRADOR', 'perfil'],
    ['PERFIL_COM_VINCULOS', 'perfil'],
  ])('%s vai para o campo %s', (codigo, campo) => {
    expect(errosDoServidor(erro(codigo, 'Mensagem do backend.'))).toEqual({
      erros: { [campo]: 'Mensagem do backend.' },
      erroGeral: MENSAGEM_CAMPOS_DESTACADOS,
    });
  });

  it('outros erros só aparecem na faixa', () => {
    expect(errosDoServidor(erro('SEM_CONEXAO', 'Não foi possível conectar ao servidor.'))).toEqual({
      erros: {},
      erroGeral: 'Não foi possível conectar ao servidor.',
    });
  });
});
