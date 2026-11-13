import { describe, expect, it } from 'vitest';
import type { ResultadoAtividade } from '../../api/acompanhamento';
import { MENSAGEM_RESULTADO_LONGO, MENSAGEM_RESULTADO_VAZIO, erroTextoResultado, planejarSalvamento } from './resultados';

// <-------------------TESTES DAS REGRAS DE RESULTADOS------------------->
const ATIVIDADES = [
  { id: 1, descricao: 'Registrar hábitos.' },
  { id: 2, descricao: 'Medir a pressão.' },
  { id: 3, descricao: 'Questionário.' },
];

const salvo = (atividadePrevistaId: number, texto: string): ResultadoAtividade => ({
  id: atividadePrevistaId * 10,
  visitaAgendadaId: 4,
  atividadePrevistaId,
  descricaoAtividade: 'Atividade.',
  texto,
  registradoPorId: 3,
  registradoEm: '2026-11-11T13:00:00Z',
  atualizadoPorId: null,
  atualizadoEm: null,
});

describe('erroTextoResultado', () => {
  it('exige texto depois de aparar e limita a 1.000 caracteres', () => {
    expect(erroTextoResultado('   ')).toBe('Informe o resultado.');
    expect(erroTextoResultado(` ${'a'.repeat(1000)} `)).toBeUndefined();
    expect(erroTextoResultado('a'.repeat(1001))).toBe(MENSAGEM_RESULTADO_LONGO);
  });
});

describe('planejarSalvamento', () => {
  it('registra só as atividades preenchidas, com o texto aparado', () => {
    expect(planejarSalvamento(ATIVIDADES, { 1: '  Dorme bem.  ', 2: '   ' }, [])).toEqual({
      envios: [{ tipo: 'registrar', atividadePrevistaId: 1, texto: 'Dorme bem.' }],
      erros: {},
    });
  });

  it('edita o resultado alterado e ignora o que ficou igual', () => {
    const salvos = [salvo(1, 'Antigo.'), salvo(2, 'Igual.')];
    expect(planejarSalvamento(ATIVIDADES, { 1: 'Novo.', 2: ' Igual. ' }, salvos)).toEqual({
      envios: [{ tipo: 'editar', atividadePrevistaId: 1, resultadoId: 10, texto: 'Novo.' }],
      erros: {},
    });
  });

  it('não deixa apagar um resultado salvo nem passar do limite', () => {
    const plano = planejarSalvamento(ATIVIDADES, { 1: '', 2: 'b'.repeat(1001), 3: 'c'.repeat(1001) }, [
      salvo(1, 'Antigo.'),
      salvo(2, 'Antigo.'),
    ]);
    expect(plano.erros).toEqual({
      1: MENSAGEM_RESULTADO_VAZIO,
      2: MENSAGEM_RESULTADO_LONGO,
      3: MENSAGEM_RESULTADO_LONGO,
    });
    expect(plano.envios).toEqual([]);
  });
});
