import { describe, expect, it } from 'vitest';
import type { RespostaCriterio } from '../../api/candidatos';
import type { TipoCriterio } from '../../api/protocolo';
import { calcularElegibilidade, respostaValida, resumirAvaliacao } from './elegibilidade';

// <-------------------TESTES DAS REGRAS DA ELEGIBILIDADE------------------->
const inclusao = (resposta: RespostaCriterio | null) => ({ tipo: 'INCLUSAO' as TipoCriterio, resposta });
const exclusao = (resposta: RespostaCriterio | null) => ({ tipo: 'EXCLUSAO' as TipoCriterio, resposta });

describe('calcularElegibilidade', () => {
  it('é não avaliado quando nenhum critério tem resposta', () => {
    expect(calcularElegibilidade([inclusao(null), exclusao(null)])).toBe('NAO_AVALIADO');
  });

  it('é elegível com todos de inclusão atendidos e nenhum de exclusão presente', () => {
    expect(calcularElegibilidade([inclusao('ATENDIDO'), inclusao('ATENDIDO'), exclusao('AUSENTE')])).toBe('ELEGIVEL');
  });

  it('é inelegível com um critério de inclusão não atendido', () => {
    expect(calcularElegibilidade([inclusao('NAO_ATENDIDO'), exclusao('AUSENTE')])).toBe('INELEGIVEL');
  });

  it('é inelegível com um critério de exclusão presente', () => {
    expect(calcularElegibilidade([inclusao('ATENDIDO'), exclusao('PRESENTE')])).toBe('INELEGIVEL');
  });

  it('fica incompleta com algum critério sem resposta, mesmo que outro já reprove', () => {
    expect(calcularElegibilidade([inclusao('ATENDIDO'), exclusao(null)])).toBe('INCOMPLETA');
    expect(calcularElegibilidade([inclusao('NAO_ATENDIDO'), exclusao(null)])).toBe('INCOMPLETA');
  });
});

describe('resumirAvaliacao', () => {
  it('conta atendidos, presentes e sem resposta', () => {
    expect(
      resumirAvaliacao([inclusao('ATENDIDO'), inclusao(null), inclusao('NAO_ATENDIDO'), exclusao('PRESENTE'), exclusao(null)]),
    ).toEqual({
      inclusaoTotal: 3,
      inclusaoAtendidos: 1,
      inclusaoNaoAtendidos: 1,
      exclusaoTotal: 2,
      exclusaoPresentes: 1,
      semResposta: 2,
    });
  });
});

describe('respostaValida', () => {
  it('aceita só as respostas do tipo do critério, ou nenhuma', () => {
    expect(respostaValida('INCLUSAO', 'ATENDIDO')).toBe(true);
    expect(respostaValida('INCLUSAO', 'PRESENTE')).toBe(false);
    expect(respostaValida('EXCLUSAO', 'AUSENTE')).toBe(true);
    expect(respostaValida('EXCLUSAO', 'NAO_ATENDIDO')).toBe(false);
    expect(respostaValida('EXCLUSAO', null)).toBe(true);
  });
});
