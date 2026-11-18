import { describe, expect, it } from 'vitest';
import {
  apararMotivo,
  dataPermite,
  diaChegou,
  erroJustificativa,
  erroMotivoVisita,
  motivoCorrecaoBloqueada,
  regraMotivo,
  situacoesCorrigiveis,
  situacoesRegistraveis,
} from './registroVisita';

// <-------------------REGRAS DO REGISTRO DA SITUAÇÃO (RF13)------------------->
const HOJE = '2026-11-14';
// 14/11 às 23:30 em Recife ainda é hoje, mesmo já sendo 15/11 em UTC
const HOJE_NOITE = '2026-11-15T02:30:00Z';
// 15/11 à 00:30 em Recife já é amanhã
const AMANHA_CEDO = '2026-11-15T03:30:00Z';
const ONTEM = '2026-11-13T12:00:00Z';

describe('regraMotivo e erroMotivoVisita', () => {
  it('exige no cancelamento, aceita sem motivo na ausência e proíbe na realização', () => {
    expect(regraMotivo('CANCELADA')).toBe('obrigatorio');
    expect(regraMotivo('AUSENTE')).toBe('opcional');
    expect(regraMotivo('REALIZADA')).toBe('proibido');

    expect(erroMotivoVisita('CANCELADA', '   ')).toBe('Informe o motivo do cancelamento.');
    expect(erroMotivoVisita('CANCELADA', 'Unidade fechada.')).toBeUndefined();
    expect(erroMotivoVisita('AUSENTE', null)).toBeUndefined();
    expect(erroMotivoVisita('AUSENTE', 'Não veio.')).toBeUndefined();
    expect(erroMotivoVisita('REALIZADA', '')).toBeUndefined();
    expect(erroMotivoVisita('REALIZADA', 'Qualquer.')).toBe('Uma visita realizada não deve ter motivo.');
  });

  it('aceita até 500 caracteres depois de aparar', () => {
    expect(erroMotivoVisita('AUSENTE', ` ${'a'.repeat(500)} `)).toBeUndefined();
    expect(erroMotivoVisita('AUSENTE', 'a'.repeat(501))).toBe('O motivo deve ter no máximo 500 caracteres.');
  });

  it('apara o motivo e troca o vazio por null, como o backend', () => {
    expect(apararMotivo('  Não veio.  ')).toBe('Não veio.');
    expect(apararMotivo('   ')).toBeNull();
    expect(apararMotivo(undefined)).toBeNull();
  });
});

describe('erroJustificativa', () => {
  it('exige de 1 a 500 caracteres depois de aparar', () => {
    expect(erroJustificativa('  ')).toBe('Informe a justificativa da correção.');
    expect(erroJustificativa(null)).toBe('Informe a justificativa da correção.');
    expect(erroJustificativa(` ${'a'.repeat(500)} `)).toBeUndefined();
    expect(erroJustificativa('a'.repeat(501))).toBe('A justificativa deve ter no máximo 500 caracteres.');
  });
});

describe('dia da visita em Recife', () => {
  it('considera o dia de Recife, incluindo o próprio dia', () => {
    expect(diaChegou(ONTEM, HOJE)).toBe(true);
    expect(diaChegou(HOJE_NOITE, HOJE)).toBe(true);
    expect(diaChegou(AMANHA_CEDO, HOJE)).toBe(false);
  });

  it('permite o cancelamento a qualquer momento', () => {
    expect(dataPermite('CANCELADA', AMANHA_CEDO, HOJE)).toBe(true);
    expect(dataPermite('REALIZADA', AMANHA_CEDO, HOJE)).toBe(false);
    expect(dataPermite('AUSENTE', HOJE_NOITE, HOJE)).toBe(true);
  });
});

describe('situacoesRegistraveis', () => {
  it('oferece as três situações a partir do dia da visita e só o cancelamento antes', () => {
    expect(situacoesRegistraveis({ situacao: 'AGENDADA', dataHora: ONTEM }, HOJE)).toEqual([
      'REALIZADA',
      'AUSENTE',
      'CANCELADA',
    ]);
    expect(situacoesRegistraveis({ situacao: 'AGENDADA', dataHora: AMANHA_CEDO }, HOJE)).toEqual(['CANCELADA']);
  });

  it('não oferece nada para visita já registrada', () => {
    expect(situacoesRegistraveis({ situacao: 'REALIZADA', dataHora: ONTEM }, HOJE)).toEqual([]);
  });
});

describe('situacoesCorrigiveis', () => {
  it('oferece as outras situações finais permitidas pela data, nunca AGENDADA', () => {
    expect(situacoesCorrigiveis({ situacao: 'AUSENTE', dataHora: ONTEM }, HOJE)).toEqual(['REALIZADA', 'CANCELADA']);
    expect(situacoesCorrigiveis({ situacao: 'CANCELADA', dataHora: ONTEM }, HOJE)).toEqual(['REALIZADA', 'AUSENTE']);
    expect(situacoesCorrigiveis({ situacao: 'REALIZADA', dataHora: ONTEM }, HOJE)).toEqual(['AUSENTE', 'CANCELADA']);
  });

  it('não corrige visita agendada nem visita cancelada antes do dia agendado', () => {
    expect(situacoesCorrigiveis({ situacao: 'AGENDADA', dataHora: ONTEM }, HOJE)).toEqual([]);
    expect(situacoesCorrigiveis({ situacao: 'CANCELADA', dataHora: AMANHA_CEDO }, HOJE)).toEqual([]);
  });
});

describe('motivoCorrecaoBloqueada', () => {
  it('bloqueia a correção da visita com resultados', () => {
    expect(motivoCorrecaoBloqueada({ possuiResultados: true })).toBe(
      'Correção bloqueada: a visita já tem resultados registrados.',
    );
    expect(motivoCorrecaoBloqueada({ possuiResultados: false })).toBeUndefined();
  });
});
