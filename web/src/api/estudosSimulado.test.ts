import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from './erros';
import type { EstudoCadastroEntrada } from './estudos';
import { reiniciarEstudosSimulados, servicoEstudosSimulado } from './estudosSimulado';

// <-------------------TESTES DO SERVIÇO SIMULADO------------------->
const ENTRADA: EstudoCadastroEntrada = {
  titulo: '  Novo estudo  ',
  objetivo: ' Objetivo. ',
  dataInicio: '2026-12-01',
  dataFim: '2027-03-01',
  limiteParticipantes: 20,
};

// Avança o atraso simulado sem esperar de verdade
async function executar<T>(promessa: Promise<T>): Promise<T> {
  const resultado = promessa.then(
    (valor) => ({ valor }),
    (erro: unknown) => ({ erro }),
  );
  await vi.runAllTimersAsync();
  const final = await resultado;
  if ('erro' in final) throw final.erro;
  return final.valor;
}

describe('servicoEstudosSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista os estudos iniciais', async () => {
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos.map((e) => e.id)).toEqual([1, 2]);
  });

  it('cadastra em planejamento, com texto aparado e no topo da lista', async () => {
    const novo = await executar(servicoEstudosSimulado.cadastrar(ENTRADA));
    expect(novo).toMatchObject({
      id: 3,
      titulo: 'Novo estudo',
      objetivo: 'Objetivo.',
      estado: 'PLANEJAMENTO',
    });
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos[0].id).toBe(3);
  });

  it('responde VALIDACAO_INVALIDA com os erros por campo', async () => {
    const erro = await executar(servicoEstudosSimulado.cadastrar({ ...ENTRADA, titulo: '' })).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { titulo: 'Informe o título.' },
    });
  });

  it('responde DATA_INVALIDA quando o fim é anterior ao início', async () => {
    const erro = await executar(
      servicoEstudosSimulado.cadastrar({ ...ENTRADA, dataFim: '2026-11-30' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 400, codigo: 'DATA_INVALIDA' });
  });

  it('não guarda o estudo recusado', async () => {
    await executar(servicoEstudosSimulado.cadastrar({ ...ENTRADA, titulo: '' })).catch(() => {});
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos).toHaveLength(2);
  });
});
