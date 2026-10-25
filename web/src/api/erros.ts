import { isAxiosError } from 'axios';

// <-------------------CONTRATO DE ERRO DA API------------------->
// Espelha o record ErroApi do backend (compartilhado/erro/ErroApi.java)
export type ErroApi = {
  codigo: string;
  mensagem: string;
  errosCampos?: Record<string, string>;
};

// <-------------------ERRO PADRONIZADO NA WEB------------------->
/**
 * Erro que as telas recebem quando uma chamada à API falha.
 * Sempre tem status, código e mensagem, mesmo quando o servidor não responde.
 */
export class ErroRequisicao extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly errosCampos: Record<string, string>;

  constructor(status: number, erro: ErroApi) {
    super(erro.mensagem);
    this.name = 'ErroRequisicao';
    this.status = status;
    this.codigo = erro.codigo;
    this.errosCampos = erro.errosCampos ?? {};
  }
}

// <-------------------CONVERSÃO DE FALHAS------------------->
// Confere se o corpo da resposta segue o contrato ErroApi
function ehErroApi(valor: unknown): valor is ErroApi {
  if (typeof valor !== 'object' || valor === null) return false;
  const erro = valor as Partial<ErroApi>;
  return typeof erro.codigo === 'string' && typeof erro.mensagem === 'string';
}

/**
 * Converte qualquer falha de requisição em um ErroRequisicao.
 * Status 0 indica que o servidor não respondeu (desligado ou sem conexão).
 */
export function converterErro(erro: unknown): ErroRequisicao {
  // Já convertido: a falha ao buscar o token CSRF passa de novo pelo interceptor da alteração
  if (erro instanceof ErroRequisicao) return erro;

  if (!isAxiosError(erro) || !erro.response) {
    return new ErroRequisicao(0, {
      codigo: 'SEM_CONEXAO',
      mensagem: 'Não foi possível conectar ao servidor. Tente novamente.',
    });
  }

  const { status, data } = erro.response;
  if (ehErroApi(data)) {
    return new ErroRequisicao(status, data);
  }

  // Resposta fora do contrato (ex.: proxy sem backend ligado)
  return new ErroRequisicao(status, {
    codigo: 'ERRO_HTTP',
    mensagem: 'Não foi possível atender à requisição.',
  });
}