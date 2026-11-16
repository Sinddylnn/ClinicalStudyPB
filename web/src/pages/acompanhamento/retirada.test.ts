import { describe, expect, it } from 'vitest';
import { erroMotivoRetirada, podeRetirar } from './retirada';

// <-------------------TESTES DAS REGRAS DE RETIRADA------------------->
describe('erroMotivoRetirada', () => {
  it('exige motivo depois de aparar e limita a 500 caracteres', () => {
    expect(erroMotivoRetirada('   ')).toBe('Informe o motivo da retirada.');
    expect(erroMotivoRetirada(` ${'a'.repeat(500)} `)).toBeUndefined();
    expect(erroMotivoRetirada('a'.repeat(501))).toBe('O motivo pode ter até 500 caracteres.');
  });
});

describe('podeRetirar', () => {
  it('só com participação ativa e o estudo em Recrutamento ou Execução', () => {
    expect(podeRetirar({ estado: 'RECRUTAMENTO' }, { situacao: 'ATIVA' })).toBe(true);
    expect(podeRetirar({ estado: 'EXECUCAO' }, { situacao: 'ATIVA' })).toBe(true);
    expect(podeRetirar({ estado: 'EXECUCAO' }, { situacao: 'RETIRADA' })).toBe(false);
    expect(podeRetirar({ estado: 'ENCERRADO' }, { situacao: 'ATIVA' })).toBe(false);
    expect(podeRetirar({ estado: 'PLANEJAMENTO' }, { situacao: 'ATIVA' })).toBe(false);
  });
});
