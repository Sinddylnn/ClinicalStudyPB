import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarCandidatosSimulados, servicoCandidatosSimulado } from './candidatosSimulado';
import { reiniciarEstudosSimulados } from './estudosSimulado';

// <-------------------TESTES DO SERVIÇO SIMULADO DE CANDIDATOS------------------->
const RECRUTAMENTO = 3;
const PLANEJAMENTO = 1;

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

describe('servicoCandidatosSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
    reiniciarCandidatosSimulados();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista os candidatos do estudo em recrutamento', async () => {
    const candidatos = await executar(servicoCandidatosSimulado.listar(RECRUTAMENTO));
    expect(candidatos).toHaveLength(6);
    expect(candidatos.every((c) => c.estudoId === RECRUTAMENTO)).toBe(true);
  });

  it('responde 404 para estudo inexistente', async () => {
    const erro = await executar(servicoCandidatosSimulado.listar(99)).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('cadastra sem avaliação e sem consentimento, com texto aparado', async () => {
    const novo = await executar(
      servicoCandidatosSimulado.cadastrar(RECRUTAMENTO, { nome: '  Gabriel Rocha ', email: ' Gabriel@Exemplo.com ' }),
    );
    expect(novo).toMatchObject({
      id: 7,
      estudoId: RECRUTAMENTO,
      nome: 'Gabriel Rocha',
      email: 'gabriel@exemplo.com',
      elegibilidade: 'NAO_AVALIADO',
      consentimento: 'PENDENTE',
      dataInclusao: null,
    });
    expect(await executar(servicoCandidatosSimulado.listar(RECRUTAMENTO))).toHaveLength(7);
  });

  it('responde VALIDACAO_INVALIDA com os erros por campo', async () => {
    const erro = await executar(
      servicoCandidatosSimulado.cadastrar(RECRUTAMENTO, { nome: '', email: 'sem-arroba' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { nome: 'Informe o nome do candidato.', email: 'Informe um e-mail válido.' },
    });
  });

  it('responde 409 para e-mail repetido no mesmo estudo, sem diferença de maiúsculas', async () => {
    const erro = await executar(
      servicoCandidatosSimulado.cadastrar(RECRUTAMENTO, { nome: 'Outra Maria', email: 'MARIA.SOUZA@exemplo.com' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 409, codigo: 'EMAIL_JA_CADASTRADO' });
    expect(await executar(servicoCandidatosSimulado.listar(RECRUTAMENTO))).toHaveLength(6);
  });

  it('responde 409 quando o estudo não está em recrutamento', async () => {
    const erro = await executar(
      servicoCandidatosSimulado.cadastrar(PLANEJAMENTO, { nome: 'Ana Costa', email: 'ana@exemplo.com' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 409, codigo: 'ESTADO_INVALIDO' });
  });
});
