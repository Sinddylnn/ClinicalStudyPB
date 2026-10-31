import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServicoCandidatos } from './candidatos';
import {
  AVALIACOES_INICIAIS,
  CANDIDATOS_INICIAIS,
  CONSENTIMENTOS_INICIAIS,
  CONTAS_INICIAIS,
  criarServicoCandidatosSimulado,
} from './candidatosSimulado';
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

  // <-------------------CONSENTIMENTO E INCLUSÃO------------------->
  describe('consentimento e inclusão', () => {
    const MARIA = 1;
    const BRUNO = 2;
    const CAMILA = 3;
    const DIEGO = 4;
    const FELIPE = 6;
    const CONTA_BRUNO_M = 11;
    const CONTA_BRUNO = 12;
    const CONTA_CAMILA = 13;

    const criar = (candidatos = CANDIDATOS_INICIAIS, estudos = servicoEstudosSimulado) =>
      criarServicoCandidatosSimulado(
        estudos,
        candidatos,
        criarServicoProtocoloSimulado(estudos, PROTOCOLOS_INICIAIS),
        AVALIACOES_INICIAIS,
        CONSENTIMENTOS_INICIAIS,
        CONTAS_INICIAIS,
      );

    beforeEach(() => {
      servicoCandidatosSimulado = criar();
    });

    it('registra o consentimento com observação aparada e atualiza o candidato', async () => {
      const registro = await executar(
        servicoCandidatosSimulado.registrarConsentimento(RECRUTAMENTO, DIEGO, {
          resposta: 'ACEITOU',
          observacao: '  Sem dúvidas.  ',
        }),
      );
      expect(registro.observacao).toBe('Sem dúvidas.');
      expect(registro.registradoPor).toBe('Carlos Coordenador');
      expect(registro.registradoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      const diego = (await executar(servicoCandidatosSimulado.listar(RECRUTAMENTO))).find((c) => c.id === DIEGO);
      expect(diego?.consentimento).toBe('ACEITOU');
    });

    it('devolve o registro salvo e o pendente sem dados', async () => {
      const camila = await executar(servicoCandidatosSimulado.obterConsentimento(RECRUTAMENTO, CAMILA));
      expect(camila.observacao).toBe('Candidata preferiu não participar.');
      const felipe = await executar(servicoCandidatosSimulado.obterConsentimento(RECRUTAMENTO, FELIPE));
      expect(felipe).toMatchObject({ observacao: null, registradoPor: null, registradoEm: null });
    });

    it('recusa observação longa com o erro no campo', async () => {
      const erro = await executar(
        servicoCandidatosSimulado.registrarConsentimento(RECRUTAMENTO, DIEGO, {
          resposta: 'RECUSOU',
          observacao: 'a'.repeat(501),
        }),
      ).catch((e: unknown) => e);
      expect(erro).toMatchObject({
        status: 400,
        codigo: 'VALIDACAO_INVALIDA',
        errosCampos: { observacao: 'A observação deve ter no máximo 500 caracteres.' },
      });
    });

    it('recusa consentimento sem avaliação registrada e depois da inclusão', async () => {
      const entrada = { resposta: 'ACEITOU' as const, observacao: null };
      const semAvaliacao = await executar(
        servicoCandidatosSimulado.registrarConsentimento(RECRUTAMENTO, FELIPE, entrada),
      ).catch((e: unknown) => e);
      expect(semAvaliacao).toMatchObject({ status: 400, codigo: 'AVALIACAO_PENDENTE' });

      const incluida = await executar(
        servicoCandidatosSimulado.registrarConsentimento(RECRUTAMENTO, MARIA, entrada),
      ).catch((e: unknown) => e);
      expect(incluida).toMatchObject({ status: 400, codigo: 'CANDIDATO_JA_INCLUIDO' });
    });

    it('recusa consentimento com o estudo fora de Recrutamento', async () => {
      const [fora] = CANDIDATOS_INICIAIS;
      servicoCandidatosSimulado = criar([{ ...fora, id: 20, estudoId: PLANEJAMENTO, dataInclusao: null }]);
      const erro = await executar(
        servicoCandidatosSimulado.registrarConsentimento(PLANEJAMENTO, 20, { resposta: 'ACEITOU', observacao: null }),
      ).catch((e: unknown) => e);
      expect(erro).toMatchObject({ status: 400, codigo: 'ESTADO_INVALIDO' });
    });

    it('devolve o que a tela confere antes de incluir', async () => {
      const dados = await executar(servicoCandidatosSimulado.obterInclusao(RECRUTAMENTO, BRUNO));
      expect(dados).toMatchObject({
        avaliadoEm: '2026-10-27T09:40:00',
        consentimentoEm: '2026-10-27T14:40:00',
        incluidos: 1,
      });
      expect(dados.contas).toHaveLength(4);
    });

    it('inclui com a data de hoje e conta a vaga', async () => {
      const incluido = await executar(
        servicoCandidatosSimulado.incluir(RECRUTAMENTO, BRUNO, { contaId: CONTA_BRUNO }),
      );
      expect(incluido.dataInclusao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const dados = await executar(servicoCandidatosSimulado.obterInclusao(RECRUTAMENTO, BRUNO));
      expect(dados.incluidos).toBe(2);
    });

    it('confere de novo cada condição antes de incluir', async () => {
      const tentar = (candidatoId: number, contaId: number) =>
        executar(servicoCandidatosSimulado.incluir(RECRUTAMENTO, candidatoId, { contaId })).catch((e: unknown) => e);

      expect(await tentar(BRUNO, 99)).toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA' });
      expect(await tentar(MARIA, 14)).toMatchObject({ status: 409, codigo: 'INCLUSAO_DUPLICADA' });
      expect(await tentar(DIEGO, CONTA_BRUNO)).toMatchObject({ status: 400, codigo: 'ELEGIBILIDADE_INVALIDA' });
      expect(await tentar(CAMILA, CONTA_CAMILA)).toMatchObject({ status: 400, codigo: 'CONSENTIMENTO_NAO_ACEITO' });
      expect(await tentar(BRUNO, CONTA_BRUNO_M)).toMatchObject({ status: 400, codigo: 'CONTA_INVALIDA' });
    });

    it('recusa a inclusão com o estudo fora de Recrutamento', async () => {
      const [fora] = CANDIDATOS_INICIAIS;
      servicoCandidatosSimulado = criar([{ ...fora, id: 20, estudoId: PLANEJAMENTO, dataInclusao: null }]);
      const erro = await executar(
        servicoCandidatosSimulado.incluir(PLANEJAMENTO, 20, { contaId: CONTA_BRUNO }),
      ).catch((e: unknown) => e);
      expect(erro).toMatchObject({ status: 400, codigo: 'ESTADO_INVALIDO' });
    });

    it('responde 409 quando o limite de vagas já foi atingido', async () => {
      const [modelo] = await executar(servicoEstudosSimulado.listar());
      const estudos = {
        listar: vi.fn().mockResolvedValue([{ ...modelo, id: RECRUTAMENTO, estado: 'RECRUTAMENTO', limiteParticipantes: 1 }]),
        cadastrar: vi.fn(),
      };
      servicoCandidatosSimulado = criar(CANDIDATOS_INICIAIS, estudos);
      const erro = await executar(
        servicoCandidatosSimulado.incluir(RECRUTAMENTO, BRUNO, { contaId: CONTA_BRUNO }),
      ).catch((e: unknown) => e);
      expect(erro).toMatchObject({
        status: 409,
        codigo: 'LIMITE_ATINGIDO',
        message: 'Não foi possível incluir: as 1 vagas do estudo já foram preenchidas.',
      });
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
