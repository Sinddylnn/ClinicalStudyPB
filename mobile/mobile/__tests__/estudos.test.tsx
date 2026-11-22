import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EstudosScreen from '../../app/(tabs)/estudos';
import { listarEstudos } from '../../services/participanteService';
import type { EstudoParticipante } from '../../services/participanteService';

// Fontes não existem no ambiente de teste (mesmo mock do navegacao.test.tsx)
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
  listarEstudos: jest.fn(),
}));

const listarEstudosMock = listarEstudos as jest.MockedFunction<typeof listarEstudos>;

const ATIVO: EstudoParticipante = {
  estudoId: 1,
  titulo: 'Acompanhamento de hábitos',
  objetivo: 'Acompanhar hábitos de sono, alimentação e atividade física.',
  estado: 'EXECUCAO',
  dataInicio: '2026-10-20',
  dataFim: '2026-12-20',
  situacaoParticipacao: 'ATIVA',
};

const RETIRADO: EstudoParticipante = {
  estudoId: 2,
  titulo: 'Piloto de hábitos alimentares',
  objetivo: 'Avaliar hábitos alimentares.',
  estado: 'ENCERRADO',
  dataInicio: '2026-09-01',
  dataFim: '2026-10-30',
  situacaoParticipacao: 'RETIRADA',
};

describe('Tela de estudos do participante', () => {
  beforeEach(() => {
    listarEstudosMock.mockReset();
  });

  it('exibe o estudo com participação ativa', async () => {
    listarEstudosMock.mockResolvedValue([ATIVO]);
    await render(<EstudosScreen />);

    expect(await screen.findByText('Acompanhamento de hábitos')).toBeTruthy();
    expect(screen.getByText('Participação ativa')).toBeTruthy();
    expect(screen.getByText('Estado do estudo: Execução')).toBeTruthy();
    expect(screen.queryByText('Retirada')).toBeNull();
    expect(screen.queryByText('Histórico de visitas disponível')).toBeNull();
  });

  it('exibe o estudo com retirada e o histórico disponível', async () => {
    listarEstudosMock.mockResolvedValue([RETIRADO]);
    await render(<EstudosScreen />);

    expect(await screen.findByText('Piloto de hábitos alimentares')).toBeTruthy();
    expect(screen.getByText('Retirada')).toBeTruthy();
    expect(screen.getByText('Histórico de visitas disponível')).toBeTruthy();
    expect(screen.getByText('Estado do estudo: Encerrado')).toBeTruthy();
  });

  it('exibe os dois estudos quando o participante tem ativo e retirado', async () => {
    listarEstudosMock.mockResolvedValue([ATIVO, RETIRADO]);
    await render(<EstudosScreen />);

    expect(await screen.findByText('Acompanhamento de hábitos')).toBeTruthy();
    expect(screen.getByText('Piloto de hábitos alimentares')).toBeTruthy();
    expect(screen.getAllByTestId('cartao-estudo')).toHaveLength(2);
  });

  it('exibe a mensagem de lista vazia', async () => {
    listarEstudosMock.mockResolvedValue([]);
    await render(<EstudosScreen />);

    expect(await screen.findByText('Você ainda não está incluída em nenhum estudo.')).toBeTruthy();
    expect(screen.queryByTestId('cartao-estudo')).toBeNull();
  });

  it('exibe o aviso de erro quando a API falha', async () => {
    listarEstudosMock.mockRejectedValue(new Error('falha'));
    await render(<EstudosScreen />);

    expect(
      await screen.findByText('Não foi possível carregar seus estudos. Tente novamente.')
    ).toBeTruthy();
  });

  it('exibe o carregamento enquanto a lista não chega', async () => {
    listarEstudosMock.mockReturnValue(new Promise<EstudoParticipante[]>(() => {}));
    await render(<EstudosScreen />);

    expect(await screen.findByText('Carregando seus estudos...')).toBeTruthy();
  });
});