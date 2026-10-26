import { describe, expect, it } from 'vitest';
import { formatarData, formatarPeriodo } from './formatacao';
import { validarEstudo, type DadosEstudo } from './validacao';

// <-------------------TESTES DA VALIDAÇÃO------------------->
const VALIDO: DadosEstudo = {
  titulo: 'Estudo de teste',
  objetivo: 'Objetivo de teste.',
  dataInicio: '2026-11-01',
  dataFim: '2027-01-31',
  limiteParticipantes: 30,
};

describe('validarEstudo', () => {
  it('aceita um estudo completo', () => {
    expect(validarEstudo(VALIDO)).toEqual({ errosCampos: {}, periodoInvalido: false });
  });

  it('acusa todos os campos vazios', () => {
    const { errosCampos } = validarEstudo({
      titulo: '   ',
      objetivo: '',
      dataInicio: '',
      dataFim: '',
      limiteParticipantes: '',
    });
    expect(errosCampos).toEqual({
      titulo: 'Informe o título.',
      objetivo: 'Informe o objetivo.',
      dataInicio: 'Informe a data de início.',
      dataFim: 'Informe a data de término.',
      limiteParticipantes: 'Informe o limite de participantes.',
    });
  });

  it('respeita os limites de tamanho do título e do objetivo', () => {
    expect(validarEstudo({ ...VALIDO, titulo: 'a'.repeat(150) }).errosCampos.titulo).toBeUndefined();
    expect(validarEstudo({ ...VALIDO, titulo: 'a'.repeat(151) }).errosCampos.titulo).toBe(
      'O título deve ter no máximo 150 caracteres.',
    );
    expect(validarEstudo({ ...VALIDO, objetivo: 'a'.repeat(2001) }).errosCampos.objetivo).toBe(
      'O objetivo deve ter no máximo 2000 caracteres.',
    );
  });

  it.each([0, -3, 2.5, 'abc'])('recusa o limite de participantes %s', (limite) => {
    expect(validarEstudo({ ...VALIDO, limiteParticipantes: limite }).errosCampos.limiteParticipantes).toBe(
      'Informe um número inteiro maior que zero.',
    );
  });

  it('recusa limite acima do maior inteiro aceito pelo backend', () => {
    expect(validarEstudo({ ...VALIDO, limiteParticipantes: 2_147_483_647 }).errosCampos).toEqual({});
    expect(validarEstudo({ ...VALIDO, limiteParticipantes: '3000000000' }).errosCampos.limiteParticipantes).toBe(
      'O limite de participantes deve ser no máximo 2.147.483.647.',
    );
  });

  it('recusa datas que não existem no calendário', () => {
    const { errosCampos, periodoInvalido } = validarEstudo({ ...VALIDO, dataInicio: '2026-02-30' });
    expect(errosCampos.dataInicio).toBe('Informe uma data válida.');
    expect(periodoInvalido).toBe(false);
    expect(validarEstudo({ ...VALIDO, dataFim: '2028-02-29' }).errosCampos).toEqual({});
  });

  it('aceita o limite vindo do campo como texto', () => {
    expect(validarEstudo({ ...VALIDO, limiteParticipantes: '12' }).errosCampos).toEqual({});
  });

  it('marca período inválido quando o fim é anterior ao início', () => {
    expect(validarEstudo({ ...VALIDO, dataFim: '2026-10-31' }).periodoInvalido).toBe(true);
  });

  it('aceita início e fim no mesmo dia', () => {
    expect(validarEstudo({ ...VALIDO, dataFim: VALIDO.dataInicio }).periodoInvalido).toBe(false);
  });
});

describe('formatarData', () => {
  it('converte AAAA-MM-DD em DD/MM/AAAA', () => {
    expect(formatarData('2026-11-03')).toBe('03/11/2026');
  });

  it('monta o período como no protótipo', () => {
    expect(formatarPeriodo('2026-11-03', '2027-02-28')).toBe('03/11/2026 – 28/02/2027');
  });
});
