import { describe, expect, it } from 'vitest';
import type { Candidato, ContaParticipante, DadosInclusao } from '../../api/candidatos';
import type { Estudo } from '../../api/estudos';
import { proximaEtapa } from './formatacao';
import { condicoesInclusao, mesmoEmail } from './inclusao';
import { validarConsentimento } from './validacao';

// <-------------------TESTES DAS REGRAS DA INCLUSÃO------------------->
const ESTUDO: Estudo = {
  id: 3,
  titulo: 'Acompanhamento de hábitos',
  objetivo: 'Objetivo.',
  dataInicio: '2026-10-20',
  dataFim: '2026-12-20',
  limiteParticipantes: 30,
  estado: 'RECRUTAMENTO',
  responsavelId: 2,
  coordenadorId: 3,
};

const CANDIDATO: Candidato = {
  id: 2,
  estudoId: 3,
  nome: 'Bruno Martins',
  email: 'bruno.martins@exemplo.com',
  elegibilidade: 'ELEGIVEL',
  consentimento: 'ACEITOU',
  dataInclusao: null,
};

const CONTA: ContaParticipante = { id: 12, nome: 'Bruno Martins', email: 'Bruno.Martins@exemplo.com' };

const DADOS: DadosInclusao = {
  candidato: CANDIDATO,
  avaliadoEm: '2026-10-27T09:40:00',
  consentimentoEm: '2026-10-27T14:40:00',
  incluidos: 1,
  contas: [CONTA],
};

const falhas = (estudo: Estudo, dados: DadosInclusao, conta?: ContaParticipante) =>
  condicoesInclusao(estudo, dados, conta)
    .filter((c) => !c.atendida)
    .map((c) => c.titulo);

describe('condicoesInclusao', () => {
  it('atende as seis condições com o candidato pronto', () => {
    const condicoes = condicoesInclusao(ESTUDO, DADOS, CONTA);
    expect(condicoes).toHaveLength(6);
    expect(condicoes.every((c) => c.atendida)).toBe(true);
    expect(condicoes.map((c) => c.detalhe)).toEqual([
      'Acompanhamento de hábitos',
      'Avaliado em 27/10/2026',
      'Registrado em 27/10/2026 às 14:40',
      'Bruno.Martins@exemplo.com',
      'A pessoa ainda não participa deste estudo',
      '1 de 30 vagas preenchidas',
    ]);
  });

  it('aponta o estudo fora de recrutamento', () => {
    const [estudo] = condicoesInclusao({ ...ESTUDO, estado: 'EXECUCAO' }, DADOS, CONTA);
    expect(estudo).toMatchObject({ atendida: false, detalhe: 'Estado atual: Execução' });
  });

  it('aponta a avaliação incompleta', () => {
    const dados = { ...DADOS, candidato: { ...CANDIDATO, elegibilidade: 'INCOMPLETA' as const } };
    expect(condicoesInclusao(ESTUDO, dados, CONTA)[1]).toMatchObject({
      atendida: false,
      detalhe: 'Situação atual: Incompleta',
    });
  });

  it('bloqueia consentimento recusado ou pendente', () => {
    const recusou = { ...DADOS, candidato: { ...CANDIDATO, consentimento: 'RECUSOU' as const } };
    expect(falhas(ESTUDO, recusou, CONTA)).toEqual(['Consentimento: recusou']);
    const pendente = { ...DADOS, consentimentoEm: null, candidato: { ...CANDIDATO, consentimento: 'PENDENTE' as const } };
    expect(condicoesInclusao(ESTUDO, pendente, CONTA)[2]).toMatchObject({
      titulo: 'Consentimento: pendente',
      detalhe: 'Ainda não registrado',
      atendida: false,
    });
  });

  it('exige conta escolhida e com o mesmo e-mail', () => {
    expect(condicoesInclusao(ESTUDO, DADOS, undefined)[3]).toMatchObject({
      atendida: false,
      detalhe: 'Escolha a conta de participante',
    });
    expect(condicoesInclusao(ESTUDO, DADOS, { ...CONTA, email: 'bruno.m@exemplo.com' })[3]).toMatchObject({
      atendida: false,
      detalhe: 'Conta: bruno.m@exemplo.com • Candidato: bruno.martins@exemplo.com',
    });
  });

  it('bloqueia quem já foi incluído e o estudo sem vagas', () => {
    const incluido = { ...DADOS, candidato: { ...CANDIDATO, dataInclusao: '2026-10-28' } };
    expect(condicoesInclusao(ESTUDO, incluido, CONTA)[4]).toMatchObject({
      atendida: false,
      detalhe: 'Incluído em 28/10/2026',
    });
    expect(falhas(ESTUDO, { ...DADOS, incluidos: 30 }, CONTA)).toEqual(['Vaga disponível']);
  });
});

describe('mesmoEmail', () => {
  it('ignora maiúsculas e espaços', () => {
    expect(mesmoEmail(' Ana@Exemplo.com ', 'ana@exemplo.com')).toBe(true);
    expect(mesmoEmail('ana@exemplo.com', 'ana.m@exemplo.com')).toBe(false);
  });
});

describe('validarConsentimento', () => {
  it('exige a resposta e limita a observação a 500 caracteres', () => {
    expect(validarConsentimento({ resposta: null, observacao: '' })).toEqual({
      resposta: 'Escolha a resposta do candidato.',
    });
    expect(validarConsentimento({ resposta: 'ACEITOU', observacao: null })).toEqual({});
    expect(validarConsentimento({ resposta: 'ACEITOU', observacao: 'a'.repeat(500) })).toEqual({});
    expect(validarConsentimento({ resposta: 'ACEITOU', observacao: 'a'.repeat(501) })).toEqual({
      observacao: 'A observação deve ter no máximo 500 caracteres.',
    });
  });
});

describe('proximaEtapa', () => {
  it('leva cada situação à tela da etapa', () => {
    expect(proximaEtapa({ ...CANDIDATO, consentimento: 'PENDENTE' })).toEqual({
      texto: 'Registrar consentimento',
      tela: 'consentimento',
    });
    expect(proximaEtapa(CANDIDATO)).toEqual({ texto: 'Incluir', principal: true, tela: 'inclusao' });
    expect(proximaEtapa({ ...CANDIDATO, consentimento: 'RECUSOU' })).toEqual({ texto: 'Ver bloqueio', tela: 'inclusao' });
    expect(proximaEtapa({ ...CANDIDATO, dataInclusao: '2026-10-28' })).toBeNull();
  });
});
