import { describe, expect, it } from 'vitest';
import type { ItemHistorico, ItemHistoricoVisita } from '../../api/acompanhamento';
import { nomeResponsavel, ordenarHistorico } from './historico';

const visita = (id: number, dataHora: string): ItemHistoricoVisita => ({
  tipo: 'VISITA',
  visitaAgendadaId: id,
  nomeVisita: `Visita ${id}`,
  dataHora,
  situacao: 'AGENDADA',
  motivo: null,
  registradoPorId: null,
  registradoEm: null,
  resultados: [],
  correcoes: [],
});

const ids = (itens: ItemHistorico[]) => itens.map((i) => (i.tipo === 'VISITA' ? i.visitaAgendadaId : 'retirada'));

describe('ordenarHistorico', () => {
  it('põe as visitas em ordem cronológica, mesmo que o backend mande fora de ordem', () => {
    const itens = [visita(2, '2026-11-20T12:00:00Z'), visita(1, '2026-11-10T12:00:00Z')];
    expect(ids(ordenarHistorico(itens))).toEqual([1, 2]);
  });

  it('deixa a retirada como último evento, mesmo com visita cancelada de data posterior', () => {
    const itens: ItemHistorico[] = [
      { tipo: 'RETIRADA', dataRetirada: '2026-11-15T12:00:00Z', motivo: 'Motivo.', retiradaPorId: 3 },
      visita(2, '2026-11-30T12:00:00Z'),
      visita(1, '2026-11-10T12:00:00Z'),
    ];
    expect(ids(ordenarHistorico(itens))).toEqual([1, 2, 'retirada']);
  });

  it('mantém a ordem recebida quando duas visitas têm a mesma data', () => {
    const itens = [visita(5, '2026-11-10T12:00:00Z'), visita(4, '2026-11-10T12:00:00Z')];
    expect(ids(ordenarHistorico(itens))).toEqual([5, 4]);
  });
});

describe('nomeResponsavel', () => {
  it('usa o nome quando o backend manda e o número da conta quando não manda', () => {
    expect(nomeResponsavel(3, 'Carlos Coordenador')).toBe('Carlos Coordenador');
    expect(nomeResponsavel(12)).toBe('Usuário nº 12');
    expect(nomeResponsavel(12, '  ')).toBe('Usuário nº 12');
  });
});
