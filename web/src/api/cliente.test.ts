import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { api, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';

// <-------------------SIMULAÇÃO DE RESPOSTAS------------------->
// Substitui a rede: o adapter devolve a falha que o teste definir
function falharCom(status: number, data: unknown) {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, {
        status,
        data,
        statusText: '',
        headers: {},
        config,
      } as AxiosResponse),
    );
}

// <-------------------TESTES DO CLIENTE HTTP------------------->
describe('cliente HTTP', () => {
  it('converte o erro do backend em ErroRequisicao', async () => {
    const corpo = {
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Confira os campos informados.',
      errosCampos: { email: 'E-mail inválido.' },
    };

    const erro = await api.get('/teste', { adapter: falharCom(400, corpo) }).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA' });
    expect(erro.errosCampos).toEqual({ email: 'E-mail inválido.' });
  });

  it('avisa quando a sessão não é válida (401)', async () => {
    const naoAutenticado = vi.fn();
    registrarTratadoresSessao({ naoAutenticado });

    await api
      .get('/teste', { adapter: falharCom(401, { codigo: 'NAO_AUTENTICADO', mensagem: 'Faça login.' }) })
      .catch(() => undefined);

    expect(naoAutenticado).toHaveBeenCalledOnce();
  });

  it('usa mensagem padrão quando o servidor não responde', async () => {
    const erro = await api
      .get('/teste', { adapter: (config) => Promise.reject(new AxiosError('sem rede', 'ERR_NETWORK', config)) })
      .catch((e) => e);

    expect(erro).toMatchObject({ status: 0, codigo: 'SEM_CONEXAO' });
  });
});