import { useEffect, useRef, useState } from 'react';
import { ErroRequisicao } from '../../api/erros';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import { LIMITE_MOTIVO_RETIRADA, erroMotivoRetirada } from './retirada';

type Props = {
  participanteNome: string;
  /** Quantas visitas ainda estão agendadas; omitido quando a tela não sabe (lista de participantes). */
  visitasAgendadas?: number;
  /** Visitas realizadas sem nenhum resultado: depois da retirada, não dá mais para lançá-los. */
  realizadasSemResultado?: number;
  /** Envia a retirada com o motivo aparado; se rejeitar, a mensagem aparece no diálogo. */
  aoRetirar: (motivo: string) => Promise<void>;
  aoCancelar: () => void;
};

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios.replace('{n}', String(n)));

function consequencias(visitasAgendadas?: number): ItemConsequencia[] {
  const visitas =
    visitasAgendadas === undefined
      ? 'As visitas ainda agendadas serão canceladas.'
      : plural(visitasAgendadas, 'A visita agendada será cancelada.', 'As {n} visitas agendadas serão canceladas.');
  return [
    { texto: 'A retirada não pode ser desfeita: o participante não volta a ficar ativo neste estudo.', tipo: 'perde' },
    ...(visitasAgendadas === 0 ? [] : [{ texto: visitas, tipo: 'perde' as const }]),
    { texto: 'Não será mais possível agendar visitas nem lançar resultados.', tipo: 'perde' },
    { texto: 'As visitas realizadas, os resultados e o histórico continuam disponíveis para consulta.', tipo: 'mantem' },
    { texto: 'A conta do participante e os outros estudos dele não são afetados.', tipo: 'mantem' },
  ];
}

// <-------------------CONFIRMAÇÃO DA RETIRADA------------------->
// RF16: a retirada é irreversível e exige motivo, com as mesmas regras do backend (1 a 500 caracteres).
// A tela só atualiza a situação depois que o backend confirma
export default function DialogoRetirada({
  participanteNome,
  visitasAgendadas,
  realizadasSemResultado = 0,
  aoRetirar,
  aoCancelar,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const focarCampo = useRef(false);

  // O campo fica desativado durante o envio: o foco só volta a ele depois de reativado
  useEffect(() => {
    if (enviando || !focarCampo.current) return;
    focarCampo.current = false;
    campo.current?.focus();
  }, [enviando]);

  const confirmar = async () => {
    setErro(undefined);
    const erroLocal = erroMotivoRetirada(motivo);
    if (erroLocal) {
      setErroCampo(erroLocal);
      campo.current?.focus();
      return;
    }

    setEnviando(true);
    try {
      await aoRetirar(motivo.trim());
    } catch (falha) {
      const doCampo = falha instanceof ErroRequisicao ? falha.errosCampos.motivo : undefined;
      if (doCampo) {
        setErroCampo(doCampo);
        focarCampo.current = true;
      } else {
        setErro(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível registrar a retirada.');
      }
      setEnviando(false);
    }
  };

  return (
    <DialogoConfirmacao
      titulo="Retirar do estudo?"
      descricao={`${participanteNome} deixa de participar do estudo.`}
      icone="usuarioX"
      tom="perigo"
      consequencias={consequencias(visitasAgendadas)}
      aviso={
        realizadasSemResultado > 0 && (
          <p className="aviso aviso-alerta">
            {plural(
              realizadasSemResultado,
              'Uma visita realizada ainda está sem resultados: depois da retirada, eles não poderão ser lançados.',
              '{n} visitas realizadas ainda estão sem resultados: depois da retirada, eles não poderão ser lançados.',
            )}
          </p>
        )
      }
      textoConfirmar="Retirar participante"
      erro={erro}
      enviando={enviando}
      aoConfirmar={confirmar}
      aoCancelar={aoCancelar}
    >
      <div className="campo">
        <label htmlFor="motivo-retirada">Motivo da retirada (obrigatório)</label>
        <textarea
          ref={campo}
          id="motivo-retirada"
          value={motivo}
          required
          aria-invalid={Boolean(erroCampo)}
          aria-describedby={erroCampo ? 'erro-motivo-retirada' : 'ajuda-motivo-retirada'}
          disabled={enviando}
          onChange={(e) => {
            setMotivo(e.target.value);
            setErroCampo(undefined);
          }}
          placeholder="Ex.: participante solicitou a saída do estudo."
        />
        <span className="campo-rodape">
          {erroCampo ? (
            <span id="erro-motivo-retirada" className="campo-erro">
              {erroCampo}
            </span>
          ) : (
            <span id="ajuda-motivo-retirada" className="campo-ajuda">
              Fica registrado no histórico. Até {LIMITE_MOTIVO_RETIRADA} caracteres.
            </span>
          )}
          <span className="campo-contador">
            {motivo.trim().length}/{LIMITE_MOTIVO_RETIRADA}
          </span>
        </span>
      </div>
    </DialogoConfirmacao>
  );
}
