import { describe, expect, it } from 'vitest';
import {
  diaRecife,
  hojeRecife,
  limitesData,
  motivoSemAgendamento,
  paraCamposLocais,
  paraInstant,
  podeAgendar,
  validarAgendamento,
} from './agendamento';

// <-------------------TESTES DAS REGRAS DE AGENDAMENTO------------------->
const ESTUDO = { dataInicio: '2026-10-20', dataFim: '2026-12-20' };
const HOJE = '2026-11-14';

describe('datas no fuso de Recife', () => {
  it('pega o dia de Recife, mesmo quando em UTC já é o dia seguinte', () => {
    expect(diaRecife('2026-12-21T01:00:00Z')).toBe('2026-12-20');
    expect(diaRecife('2026-12-21T03:00:00Z')).toBe('2026-12-21');
    expect(hojeRecife(new Date('2026-11-15T02:30:00Z'))).toBe('2026-11-14');
  });

  it('converte a data e a hora de Recife para Instant UTC sem milissegundos, e volta', () => {
    expect(paraInstant('2026-11-20', '09:30')).toBe('2026-11-20T12:30:00Z');
    expect(paraInstant('2026-12-20', '22:00')).toBe('2026-12-21T01:00:00Z');
    expect(paraCamposLocais('2026-12-21T01:00:00Z')).toEqual({ data: '2026-12-20', hora: '22:00' });
  });
});

describe('limitesData', () => {
  it('usa o maior entre hoje e o início do estudo, até o fim do estudo', () => {
    expect(limitesData(ESTUDO, HOJE)).toEqual({ min: '2026-11-14', max: '2026-12-20' });
    expect(limitesData({ dataInicio: '2026-12-01', dataFim: '2027-04-30' }, HOJE)).toEqual({
      min: '2026-12-01',
      max: '2027-04-30',
    });
  });
});

describe('podeAgendar e motivoSemAgendamento', () => {
  it('só permite participação ativa com o estudo em Recrutamento ou Execução', () => {
    expect(podeAgendar({ estado: 'RECRUTAMENTO' }, { situacao: 'ATIVA' })).toBe(true);
    expect(podeAgendar({ estado: 'EXECUCAO' }, { situacao: 'ATIVA' })).toBe(true);
    expect(podeAgendar({ estado: 'ENCERRADO' }, { situacao: 'ATIVA' })).toBe(false);
    expect(podeAgendar({ estado: 'RECRUTAMENTO' }, { situacao: 'RETIRADA' })).toBe(false);
  });

  it('explica a retirada antes do estado do estudo', () => {
    expect(motivoSemAgendamento({ estado: 'RECRUTAMENTO' }, { situacao: 'ATIVA' })).toBeUndefined();
    expect(motivoSemAgendamento({ estado: 'ENCERRADO' }, { situacao: 'RETIRADA' })).toMatch(/retirado do estudo/);
    expect(motivoSemAgendamento({ estado: 'PLANEJAMENTO' }, { situacao: 'ATIVA' })).toBe(
      'O agendamento e o registro de visitas só ficam disponíveis com o estudo em Recrutamento ou Execução.',
    );
  });
});

describe('validarAgendamento', () => {
  const valido = { visitaPrevistaId: '4', data: '2026-11-20', hora: '09:30' };

  it('aceita uma data de hoje em diante dentro do período', () => {
    expect(validarAgendamento(valido, ESTUDO, HOJE)).toEqual({});
    expect(validarAgendamento({ ...valido, data: HOJE }, ESTUDO, HOJE)).toEqual({});
    expect(validarAgendamento({ ...valido, data: '2026-12-20' }, ESTUDO, HOJE)).toEqual({});
  });

  it('exige visita, data e hora', () => {
    expect(validarAgendamento({ visitaPrevistaId: '', data: '', hora: '' }, ESTUDO, HOJE)).toEqual({
      visitaPrevistaId: 'Selecione a visita prevista.',
      data: 'Informe a data da visita.',
      hora: 'Informe a hora da visita.',
    });
  });

  it('não exige a visita no reagendamento', () => {
    expect(validarAgendamento({ ...valido, visitaPrevistaId: '' }, ESTUDO, HOJE, false)).toEqual({});
  });

  it('recusa dia anterior a hoje e dia fora do período do estudo', () => {
    expect(validarAgendamento({ ...valido, data: '2026-11-13' }, ESTUDO, HOJE).data).toBe(
      'A data da visita não pode ser anterior a hoje.',
    );
    expect(validarAgendamento({ ...valido, data: '2026-12-21' }, ESTUDO, HOJE).data).toBe(
      'A data da visita deve estar dentro do período do estudo (20/10/2026 a 20/12/2026).',
    );
    expect(
      validarAgendamento({ ...valido, data: '2026-11-20' }, { dataInicio: '2026-12-01', dataFim: '2027-04-30' }, HOJE)
        .data,
    ).toMatch(/dentro do período do estudo/);
  });
});
