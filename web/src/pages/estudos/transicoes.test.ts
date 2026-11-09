import { describe, expect, it } from 'vitest';
import type { EstadoEstudo } from '../../api/estudos';
import {
  encerramentoAntecipado,
  normalizarJustificativa,
  permiteTransicao,
  validarEntradaEstado,
  validarJustificativa,
  verificarTransicao,
  type SituacaoTransicao,
} from './transicoes';

// <-------------------TESTES DAS REGRAS DE TRANSIÇÃO------------------->
const ESTADOS: EstadoEstudo[] = ['PLANEJAMENTO', 'RECRUTAMENTO', 'EXECUCAO', 'ENCERRADO'];

const PERMITIDAS = [
  'PLANEJAMENTO→RECRUTAMENTO',
  'PLANEJAMENTO→ENCERRADO',
  'RECRUTAMENTO→EXECUCAO',
  'RECRUTAMENTO→ENCERRADO',
  'EXECUCAO→ENCERRADO',
];

// Tudo atendido: protocolo completo, com inclusões quando a execução exige
const LIVRE: SituacaoTransicao = { pendencias: [], visitasSemAtividade: [], possuiInclusoes: false };
const COM_INCLUSOES: SituacaoTransicao = { pendencias: [], visitasSemAtividade: [], possuiInclusoes: true };

describe('permiteTransicao', () => {
  // As dezesseis combinações, como os testes de domínio do backend (EstudoEstadoTest)
  const combinacoes = ESTADOS.flatMap((origem) => ESTADOS.map((destino) => [origem, destino] as const));

  it.each(combinacoes)('%s → %s', (origem, destino) => {
    expect(permiteTransicao(origem, destino)).toBe(PERMITIDAS.includes(`${origem}→${destino}`));
  });

  it('recusa as proibidas com TRANSICAO_ESTADO_INVALIDA e a mensagem do backend', () => {
    for (const [origem, destino] of combinacoes) {
      if (PERMITIDAS.includes(`${origem}→${destino}`)) continue;
      expect(verificarTransicao(origem, { estado: destino }, COM_INCLUSOES)).toEqual({
        codigo: 'TRANSICAO_ESTADO_INVALIDA',
        mensagem: `Não é permitido mudar de ${origem} para ${destino}.`,
      });
    }
  });
});

describe('justificativa de encerramento', () => {
  it('normaliza espaços e trata texto em branco como ausência', () => {
    expect(normalizarJustificativa('  Motivo.  ')).toBe('Motivo.');
    expect(normalizarJustificativa('   ')).toBeNull();
    expect(normalizarJustificativa('')).toBeNull();
    expect(normalizarJustificativa(null)).toBeNull();
    expect(normalizarJustificativa(undefined)).toBeNull();
  });

  it('só é antecipado o encerramento antes da execução', () => {
    expect(encerramentoAntecipado('PLANEJAMENTO')).toBe(true);
    expect(encerramentoAntecipado('RECRUTAMENTO')).toBe(true);
    expect(encerramentoAntecipado('EXECUCAO')).toBe(false);
  });

  it('é obrigatória no encerramento antecipado e opcional a partir da execução', () => {
    const obrigatoria = 'Informe a justificativa para encerrar o estudo antes da execução.';
    expect(validarJustificativa('PLANEJAMENTO', 'ENCERRADO', '  ')).toBe(obrigatoria);
    expect(validarJustificativa('RECRUTAMENTO', 'ENCERRADO', undefined)).toBe(obrigatoria);
    expect(validarJustificativa('PLANEJAMENTO', 'ENCERRADO', 'Motivo.')).toBeUndefined();
    expect(validarJustificativa('EXECUCAO', 'ENCERRADO', '')).toBeUndefined();
    expect(validarJustificativa('EXECUCAO', 'ENCERRADO', 'Motivo.')).toBeUndefined();
  });

  it('aceita até 500 caracteres depois de aparar', () => {
    expect(validarJustificativa('PLANEJAMENTO', 'ENCERRADO', ` ${'a'.repeat(500)} `)).toBeUndefined();
    expect(validarJustificativa('PLANEJAMENTO', 'ENCERRADO', 'a'.repeat(501))).toBe(
      'A justificativa deve ter no máximo 500 caracteres.',
    );
  });

  it('é recusada em mudança que não seja encerramento', () => {
    expect(validarJustificativa('PLANEJAMENTO', 'RECRUTAMENTO', 'Motivo.')).toBe(
      'A justificativa de encerramento só deve ser informada ao encerrar o estudo.',
    );
    expect(validarJustificativa('RECRUTAMENTO', 'EXECUCAO', '   ')).toBeUndefined();
  });
});

describe('verificarTransicao', () => {
  it('permite os cinco caminhos quando as condições são atendidas', () => {
    expect(verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, LIVRE)).toBeNull();
    expect(verificarTransicao('RECRUTAMENTO', { estado: 'EXECUCAO' }, COM_INCLUSOES)).toBeNull();
    expect(verificarTransicao('EXECUCAO', { estado: 'ENCERRADO' }, COM_INCLUSOES)).toBeNull();
    const motivo = { estado: 'ENCERRADO' as const, justificativaEncerramento: 'Cancelado.' };
    expect(verificarTransicao('PLANEJAMENTO', motivo, LIVRE)).toBeNull();
    expect(verificarTransicao('RECRUTAMENTO', motivo, LIVRE)).toBeNull();
  });

  it('confere os campos antes do caminho (@Valid)', () => {
    expect(validarEntradaEstado({ estado: 'ENCERRADO', justificativaEncerramento: 'a'.repeat(501) })).toEqual({
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Confira os campos informados.',
      errosCampos: { justificativaEncerramento: 'A justificativa deve ter no máximo 500 caracteres.' },
    });
    // Mesmo num caminho proibido, o campo inválido vem primeiro
    expect(
      verificarTransicao('ENCERRADO', { estado: 'PLANEJAMENTO', justificativaEncerramento: 'a'.repeat(501) }, LIVRE),
    ).toMatchObject({ codigo: 'VALIDACAO_INVALIDA' });
    expect(
      verificarTransicao('PLANEJAMENTO', { estado: undefined as unknown as EstadoEstudo }, LIVRE),
    ).toMatchObject({ codigo: 'VALIDACAO_INVALIDA', errosCampos: { estado: 'O estado é obrigatório.' } });
    expect(validarEntradaEstado({ estado: 'RECRUTAMENTO' })).toBeNull();
  });

  it('para o recrutamento, devolve a primeira pendência na ordem do backend', () => {
    const tudo: SituacaoTransicao = {
      pendencias: ['VISITA_PREVISTA', 'CRITERIOS_EXCLUSAO', 'CRITERIO_INCLUSAO', 'COORDENADOR'],
      visitasSemAtividade: ['Acompanhamento'],
      possuiInclusoes: false,
    };
    expect(verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, tudo)).toEqual({
      codigo: 'COORDENADOR_OBRIGATORIO',
      mensagem: 'Atribua um coordenador ao estudo antes de iniciar o recrutamento.',
    });

    const semCoordenador = { ...tudo, pendencias: tudo.pendencias.filter((p) => p !== 'COORDENADOR') };
    expect(verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, semCoordenador)).toEqual({
      codigo: 'PROTOCOLO_INCOMPLETO',
      mensagem: 'Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.',
    });

    expect(
      verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, { ...LIVRE, pendencias: ['VISITA_PREVISTA', 'CRITERIOS_EXCLUSAO'] }),
    ).toEqual({
      codigo: 'PROTOCOLO_INCOMPLETO',
      mensagem: 'Cadastre os critérios de exclusão ou confirme que não existem exclusões.',
    });

    expect(verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, { ...LIVRE, pendencias: ['VISITA_PREVISTA'] })).toEqual({
      codigo: 'PROTOCOLO_INCOMPLETO',
      mensagem: 'Cadastre pelo menos uma visita prevista para iniciar o recrutamento.',
    });
  });

  it('identifica a primeira visita sem atividade, quando há visitas cadastradas', () => {
    const situacao: SituacaoTransicao = {
      ...LIVRE,
      pendencias: ['VISITA_PREVISTA'],
      visitasSemAtividade: ['Acompanhamento', 'Visita final'],
    };
    expect(verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, situacao)).toEqual({
      codigo: 'PROTOCOLO_INCOMPLETO',
      mensagem: 'Cadastre pelo menos uma atividade na visita: Acompanhamento.',
    });
    // Pendências anteriores vêm primeiro, mesmo com visita sem atividade
    expect(
      verificarTransicao('PLANEJAMENTO', { estado: 'RECRUTAMENTO' }, { ...situacao, pendencias: ['CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA'] }),
    ).toMatchObject({ mensagem: 'Cadastre os critérios de exclusão ou confirme que não existem exclusões.' });
  });

  it('confere o protocolo antes de recusar a justificativa fora do encerramento', () => {
    const entrada = { estado: 'RECRUTAMENTO' as const, justificativaEncerramento: 'Motivo.' };
    expect(verificarTransicao('PLANEJAMENTO', entrada, { ...LIVRE, pendencias: ['COORDENADOR'] })).toMatchObject({
      codigo: 'COORDENADOR_OBRIGATORIO',
    });
    expect(verificarTransicao('PLANEJAMENTO', entrada, LIVRE)).toEqual({
      codigo: 'JUSTIFICATIVA_INVALIDA',
      mensagem: 'A justificativa de encerramento só deve ser informada ao encerrar o estudo.',
    });
    // Texto em branco é ausência, então não é recusado
    expect(verificarTransicao('PLANEJAMENTO', { ...entrada, justificativaEncerramento: '  ' }, LIVRE)).toBeNull();
  });

  it('exige ao menos uma inclusão para iniciar a execução', () => {
    expect(verificarTransicao('RECRUTAMENTO', { estado: 'EXECUCAO' }, LIVRE)).toEqual({
      codigo: 'ESTUDO_SEM_PARTICIPANTES',
      mensagem: 'Inclua pelo menos um participante antes de iniciar a execução.',
    });
    expect(
      verificarTransicao('RECRUTAMENTO', { estado: 'EXECUCAO', justificativaEncerramento: 'Motivo.' }, COM_INCLUSOES),
    ).toMatchObject({ codigo: 'JUSTIFICATIVA_INVALIDA' });
  });

  it('recusa o encerramento antecipado de estudo que já teve inclusões, antes de olhar a justificativa', () => {
    const erro = {
      codigo: 'ESTUDO_COM_PARTICIPANTES',
      mensagem: 'O estudo já possui inclusões e não pode ser encerrado antes da execução.',
    };
    expect(verificarTransicao('RECRUTAMENTO', { estado: 'ENCERRADO', justificativaEncerramento: 'Motivo.' }, COM_INCLUSOES)).toEqual(erro);
    expect(verificarTransicao('PLANEJAMENTO', { estado: 'ENCERRADO' }, COM_INCLUSOES)).toEqual(erro);
  });

  it('exige a justificativa no encerramento antecipado sem inclusões', () => {
    expect(verificarTransicao('RECRUTAMENTO', { estado: 'ENCERRADO', justificativaEncerramento: '  ' }, LIVRE)).toEqual({
      codigo: 'JUSTIFICATIVA_OBRIGATORIA',
      mensagem: 'Informe a justificativa para encerrar o estudo antes da execução.',
    });
  });

  it('encerra a partir da execução com ou sem justificativa, mesmo com inclusões', () => {
    expect(verificarTransicao('EXECUCAO', { estado: 'ENCERRADO', justificativaEncerramento: null }, COM_INCLUSOES)).toBeNull();
    expect(verificarTransicao('EXECUCAO', { estado: 'ENCERRADO', justificativaEncerramento: 'Fim.' }, COM_INCLUSOES)).toBeNull();
  });
});
