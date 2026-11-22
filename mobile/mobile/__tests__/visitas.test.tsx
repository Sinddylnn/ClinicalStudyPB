import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import VisitasScreen from '../../app/(tabs)/visitas';
import {
  listarHistoricoVisitas,
  listarProximasVisitas,
} from '../../services/participanteService';
import type { VisitaParticipante } from '../../services/participanteService';

// Fontes não existem no ambiente de teste (mesmo mock dos outros testes)
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));

// A tela usa useFocusEffect, que exige um navegador: aqui ele roda uma vez ao montar
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (efeito: () => void) => useEffect(efeito, [efeito]) };
});

// Nenhum teste vai à rede: o serviço é simulado
jest.mock('../../services/participanteService', () => ({
  listarProximasVisitas: jest.fn(),
  listarHistoricoVisitas: jest.fn(),
}));

const proximasMock = listarProximasVisitas as jest.MockedFunction<typeof listarProximasVisitas>;
const historicoMock = listarHistoricoVisitas as jest.MockedFunction<typeof listarHistoricoVisitas>;

const PROXIMA_1: VisitaParticipante = {
  id: 10,
  estudoTitulo: 'Acompanhamento de hábitos',
  titulo: 'Visita 2 • Acompanhamento',
  dataHora: '2026-11-05T12:00:00Z', // 09:00 em Recife
  situacao: 'AGENDADA',
};

const PROXIMA_2: VisitaParticipante = {
  id: 11,
  estudoTitulo: 'Acompanhamento de hábitos',
  titulo: 'Visita 3 • Encerramento',
  dataHora: '2026-12-03T12:00:00Z', // 09:00 em Recife
  situacao: 'AGENDADA',
};

const HISTORICO: VisitaParticipante[] = [
  { id: 1, estudoTitulo: 'Acompanhamento de hábitos', titulo: 'Visita 1 • Inicial', dataHora: '2026-10-28T12:00:00Z', situacao: 'REALIZADA' },
  { id: 2, estudoTitulo: 'Piloto de hábitos alimentares', titulo: 'Visita 3', dataHora: '2026-10-28T17:00:00Z', situacao: 'CANCELADA' },
  { id: 3, estudoTitulo: 'Piloto de hábitos alimentares', titulo: 'Visita 2', dataHora: '2026-10-21T17:00:00Z', situacao: 'AUSENTE' },
  { id: 4, estudoTitulo: 'Piloto de hábitos alimentares', titulo: 'Visita 1 • Inicial', dataHora: '2026-10-14T17:00:00Z', situacao: 'REALIZADA' },
];

describe('Tela de visitas do participante', () => {
  beforeEach(() => {
    proximasMock.mockReset();
    historicoMock.mockReset();
    historicoMock.mockResolvedValue([]);
  });

  it('exibe as próximas visitas com a data formatada', async () => {
    proximasMock.mockResolvedValue([PROXIMA_1, PROXIMA_2]);
    await render(<VisitasScreen />);

    expect(await screen.findByText('Visita 2 • Acompanhamento')).toBeTruthy();
    expect(screen.getByText('Quinta, 05/11/2026 • 09:00')).toBeTruthy();
    expect(screen.getByText('Visita 3 • Encerramento')).toBeTruthy();
    expect(screen.getByText('Quinta, 03/12/2026 • 09:00')).toBeTruthy();
    expect(screen.getAllByText('Agendada')).toHaveLength(2);
  });

  it('exibe os botões sem ação só na primeira visita', async () => {
    proximasMock.mockResolvedValue([PROXIMA_1, PROXIMA_2]);
    await render(<VisitasScreen />);

    await screen.findByText('Visita 2 • Acompanhamento');
    expect(screen.getAllByText('Confirmar presença')).toHaveLength(1);
    expect(screen.getAllByText('Pedir reagendamento')).toHaveLength(1);
  });

  it('converte o horário para America/Recife sem mudar o dia', async () => {
    // 01:30 UTC de 06/11 é 22:30 de 05/11 em Recife (UTC-3)
    proximasMock.mockResolvedValue([{ ...PROXIMA_1, dataHora: '2026-11-06T01:30:00Z' }]);
    await render(<VisitasScreen />);

    expect(await screen.findByText('Quinta, 05/11/2026 • 22:30')).toBeTruthy();
  });

  it('exibe a mensagem quando não há próximas visitas', async () => {
    proximasMock.mockResolvedValue([]);
    await render(<VisitasScreen />);

    expect(await screen.findByText('Você não tem visitas agendadas.')).toBeTruthy();
    expect(screen.queryByTestId('cartao-visita')).toBeNull();
  });

  it('exibe o histórico com o resumo de comparecimento', async () => {
    proximasMock.mockResolvedValue([]);
    historicoMock.mockResolvedValue(HISTORICO);
    await render(<VisitasScreen />);

    await screen.findByText('Você não tem visitas agendadas.');
    await fireEvent.press(screen.getByText('Histórico'));

    expect(await screen.findByText('2 realizadas')).toBeTruthy();
    expect(screen.getByText('1 ausência')).toBeTruthy();
    expect(screen.getByText('1 cancelada')).toBeTruthy();
    expect(screen.getAllByTestId('cartao-visita')).toHaveLength(4);
    expect(screen.getByText('28/10/2026 • 09:00')).toBeTruthy();
    expect(screen.queryByText('Confirmar presença')).toBeNull();
  });

  it('exibe a mensagem quando não há histórico', async () => {
    proximasMock.mockResolvedValue([PROXIMA_1]);
    await render(<VisitasScreen />);

    await screen.findByText('Visita 2 • Acompanhamento');
    await fireEvent.press(screen.getByText('Histórico'));

    expect(await screen.findByText('Você ainda não tem histórico de visitas.')).toBeTruthy();
  });

  it('exibe o aviso de erro quando a API falha', async () => {
    proximasMock.mockRejectedValue(new Error('falha'));
    await render(<VisitasScreen />);

    expect(
      await screen.findByText('Não foi possível carregar suas visitas. Tente novamente.')
    ).toBeTruthy();
  });

  it('exibe o carregamento enquanto as listas não chegam', async () => {
    proximasMock.mockReturnValue(new Promise<VisitaParticipante[]>(() => {}));
    await render(<VisitasScreen />);

    expect(await screen.findByText('Carregando suas visitas...')).toBeTruthy();
  });
});