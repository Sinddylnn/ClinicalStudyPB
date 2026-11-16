import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import DialogoRetirada from './DialogoRetirada';

// <-------------------TESTES DO DIÁLOGO DE RETIRADA------------------->
type Opcoes = { visitasAgendadas?: number; realizadasSemResultado?: number; aoRetirar?: (motivo: string) => Promise<void> };

function abrir({ visitasAgendadas, realizadasSemResultado, aoRetirar = vi.fn().mockResolvedValue(undefined) }: Opcoes = {}) {
  const aoCancelar = vi.fn();
  render(
    <div className="pagina-interna">
      <button type="button">Retirar do estudo</button>
      <DialogoRetirada
        participanteNome="Maria Souza"
        visitasAgendadas={visitasAgendadas}
        realizadasSemResultado={realizadasSemResultado}
        aoRetirar={aoRetirar}
        aoCancelar={aoCancelar}
      />
    </div>,
  );
  return { aoRetirar, aoCancelar };
}

const motivo = () => screen.getByLabelText('Motivo da retirada (obrigatório)');
const confirmar = () => userEvent.click(screen.getByRole('button', { name: 'Retirar participante' }));

describe('DialogoRetirada', () => {
  it('explica que é irreversível, o que se perde e o que continua', () => {
    abrir({ visitasAgendadas: 2 });

    const dialogo = screen.getByRole('dialog', { name: 'Retirar do estudo?' });
    expect(dialogo).toHaveAccessibleDescription('Maria Souza deixa de participar do estudo.');
    expect(screen.getByText(/A retirada não pode ser desfeita/)).toBeInTheDocument();
    expect(screen.getByText('As 2 visitas agendadas serão canceladas.')).toBeInTheDocument();
    expect(screen.getByText(/o histórico continuam disponíveis para consulta/)).toBeInTheDocument();
  });

  it('ajusta o texto das visitas agendadas: uma, nenhuma ou quantidade desconhecida', () => {
    const { unmount } = render(
      <DialogoRetirada participanteNome="Maria Souza" visitasAgendadas={1} aoRetirar={vi.fn()} aoCancelar={vi.fn()} />,
    );
    expect(screen.getByText('A visita agendada será cancelada.')).toBeInTheDocument();
    unmount();

    const segundo = render(
      <DialogoRetirada participanteNome="Maria Souza" visitasAgendadas={0} aoRetirar={vi.fn()} aoCancelar={vi.fn()} />,
    );
    expect(screen.queryByText(/serão canceladas|será cancelada/)).not.toBeInTheDocument();
    segundo.unmount();

    abrir();
    expect(screen.getByText('As visitas ainda agendadas serão canceladas.')).toBeInTheDocument();
  });

  it('avisa das visitas realizadas que ainda estão sem resultados', () => {
    abrir({ realizadasSemResultado: 2 });
    expect(screen.getByText(/2 visitas realizadas ainda estão sem resultados/)).toBeInTheDocument();
  });

  it('exige o motivo antes de enviar e foca o campo', async () => {
    const { aoRetirar } = abrir();

    await userEvent.type(motivo(), '   ');
    await confirmar();

    expect(screen.getByText('Informe o motivo da retirada.')).toBeInTheDocument();
    expect(motivo()).toHaveAttribute('aria-invalid', 'true');
    expect(motivo()).toHaveFocus();
    expect(aoRetirar).not.toHaveBeenCalled();
  });

  it('envia o motivo aparado e conta os caracteres sem os espaços das pontas', async () => {
    const { aoRetirar } = abrir();

    await userEvent.type(motivo(), '  Mudou de cidade.  ');
    expect(screen.getByText('16/500')).toBeInTheDocument();
    await confirmar();

    expect(aoRetirar).toHaveBeenCalledWith('Mudou de cidade.');
  });

  it('mostra no campo o erro de motivo que vem da API', async () => {
    const erro = new ErroRequisicao(400, {
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Confira os campos informados.',
      errosCampos: { motivo: 'O motivo pode ter até 500 caracteres.' },
    });
    abrir({ aoRetirar: vi.fn().mockRejectedValue(erro) });

    await userEvent.type(motivo(), 'Ok.');
    await confirmar();

    expect(await screen.findByText('O motivo pode ter até 500 caracteres.')).toBeInTheDocument();
    expect(motivo()).toHaveFocus();
  });

  it('mostra o erro geral e deixa tentar de novo', async () => {
    const erro = new ErroRequisicao(400, { codigo: 'ESTADO_ESTUDO_INVALIDO', mensagem: 'O estudo não permite retirada.' });
    abrir({ aoRetirar: vi.fn().mockRejectedValueOnce(erro).mockRejectedValueOnce(new Error('rede')) });

    await userEvent.type(motivo(), 'Ok.');
    await confirmar();
    expect(await screen.findByRole('alert')).toHaveTextContent('O estudo não permite retirada.');

    await confirmar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível registrar a retirada.');
    expect(screen.getByRole('button', { name: 'Retirar participante' })).toBeEnabled();
  });

  it('fecha pelo Cancelar', async () => {
    const { aoCancelar } = abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalled();
  });
});
