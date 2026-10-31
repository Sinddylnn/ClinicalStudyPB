import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServicoCandidatos } from './candidatos';
import { AVALIACOES_INICIAIS, CANDIDATOS_INICIAIS, criarServicoCandidatosSimulado } from './candidatosSimulado';
import { reiniciarEstudosSimulados, servicoEstudosSimulado } from './estudosSimulado';
import { criarServicoProtocoloSimulado, PROTOCOLOS_INICIAIS } from './protocoloSimulado';

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
  let servicoCandidatosSimulado: ServicoCandidatos;

  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
    servicoCandidatosSimulado = criarServicoCandidatosSimulado(servicoEstudosSimulado, CANDIDATOS_INICIAIS);
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

  it('responde 400 (regra de negócio) quando o estudo não está em recrutamento', async () => {
    const erro = await executar(
      servicoCandidatosSimulado.cadastrar(PLANEJAMENTO, { nome: 'Ana Costa', email: 'ana@exemplo.com' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 400, codigo: 'ESTADO_INVALIDO' });
  });

  // <-------------------ELEGIBILIDADE------------------->
  describe('elegibilidade', () => {
    const DIEGO = 4;
    const FELIPE = 6;
    const MARIA = 1;
    const INCLUSAO = 3;
    const EXCLUSAO = 4;

    beforeEach(() => {
      servicoCandidatosSimulado = criarServicoCandidatosSimulado(
        servicoEstudosSimulado,
        CANDIDATOS_INICIAIS,
        criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS),
        AVALIACOES_INICIAIS,
      );
    });

    it('devolve os critérios do protocolo com as respostas salvas e quem avaliou', async () => {
      const avaliacao = await executar(servicoCandidatosSimulado.obterElegibilidade(RECRUTAMENTO, DIEGO));
      expect(avaliacao.situacao).toBe('INELEGIVEL');
      expect(avaliacao.itens).toEqual([
        { criterioId: INCLUSAO, tipo: 'INCLUSAO', descricao: 'Adultos com idade entre 18 e 60 anos.', resposta: 'ATENDIDO' },
        { criterioId: EXCLUSAO, tipo: 'EXCLUSAO', descricao: 'Gestantes ou lactantes.', resposta: 'PRESENTE' },
      ]);
      expect(avaliacao.avaliadoPor).toBe('Carlos Coordenador');
    });

    it('começa sem respostas para o candidato ainda não avaliado', async () => {
      const avaliacao = await executar(servicoCandidatosSimulado.obterElegibilidade(RECRUTAMENTO, FELIPE));
      expect(avaliacao.situacao).toBe('NAO_AVALIADO');
      expect(avaliacao.itens.map((i) => i.resposta)).toEqual([null, null]);
      expect(avaliacao.avaliadoPor).toBeNull();
    });

    it('salva, calcula a situação e atualiza o candidato na lista', async () => {
      const salva = await executar(
        servicoCandidatosSimulado.avaliarElegibilidade(RECRUTAMENTO, FELIPE, {
          respostas: [
            { criterioId: INCLUSAO, resposta: 'ATENDIDO' },
            { criterioId: EXCLUSAO, resposta: 'AUSENTE' },
          ],
        }),
      );
      expect(salva.situacao).toBe('ELEGIVEL');
      expect(salva.avaliadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      const felipe = (await executar(servicoCandidatosSimulado.listar(RECRUTAMENTO))).find((c) => c.id === FELIPE);
      expect(felipe?.elegibilidade).toBe('ELEGIVEL');
    });

    it('aceita salvar incompleta', async () => {
      const salva = await executar(
        servicoCandidatosSimulado.avaliarElegibilidade(RECRUTAMENTO, FELIPE, {
          respostas: [{ criterioId: INCLUSAO, resposta: 'ATENDIDO' }],
        }),
      );
      expect(salva.situacao).toBe('INCOMPLETA');
      expect(salva.itens.map((i) => i.resposta)).toEqual(['ATENDIDO', null]);
    });

    it('recusa avaliação sem resposta e resposta de outro tipo ou de outro protocolo', async () => {
      for (const respostas of [
        [],
        [{ criterioId: EXCLUSAO, resposta: 'ATENDIDO' as const }],
        [{ criterioId: 1, resposta: 'ATENDIDO' as const }],
      ]) {
        const erro = await executar(
          servicoCandidatosSimulado.avaliarElegibilidade(RECRUTAMENTO, FELIPE, { respostas }),
        ).catch((e: unknown) => e);
        expect(erro).toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA' });
      }
    });

    it('recusa corrigir depois da inclusão (a avaliação fica no histórico)', async () => {
      const erro = await executar(
        servicoCandidatosSimulado.avaliarElegibilidade(RECRUTAMENTO, MARIA, {
          respostas: [{ criterioId: INCLUSAO, resposta: 'NAO_ATENDIDO' }],
        }),
      ).catch((e: unknown) => e);
      expect(erro).toMatchObject({ status: 400, codigo: 'CANDIDATO_JA_INCLUIDO' });
    });

    it('responde 404 para candidato de outro estudo', async () => {
      const erro = await executar(servicoCandidatosSimulado.obterElegibilidade(PLANEJAMENTO, DIEGO)).catch(
        (e: unknown) => e,
      );
      expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
    });
  });

  it('procura o estudo na fonte de estudos recebida, sem misturar com os simulados', async () => {
    const [modelo] = await executar(servicoEstudosSimulado.listar());
    const estudosReais = {
      listar: vi.fn().mockResolvedValue([{ ...modelo, id: 10, estado: 'RECRUTAMENTO' }]),
      cadastrar: vi.fn(),
    };
    const servico = criarServicoCandidatosSimulado(estudosReais, []);

    expect(await executar(servico.listar(10))).toEqual([]);
    const erro = await executar(servico.listar(RECRUTAMENTO)).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 404 });
  });
});
