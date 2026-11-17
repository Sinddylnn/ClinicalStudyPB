import { useEffect, useRef, useState } from 'react';
import type { ResumoVisitaAgendada, SituacaoFinal } from '../../api/acompanhamento';
import { ErroRequisicao } from '../../api/erros';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import type { NomeIcone } from '../../components/icones';
import { formatarDataHora } from '../recrutamento/formatacao';
import { LIMITE_TEXTO_VISITA, apararMotivo, erroMotivoVisita, regraMotivo } from './registroVisita';

type Props = {
  visita: ResumoVisitaAgendada;
  /** Situação escolhida pelo botão da lista. */
  situacao: SituacaoFinal;
  /** Envia o registro com o motivo aparado (null quando não há); se rejeitar, o erro aparece no diálogo. */
  aoRegistrar: (motivo: string | null) => Promise<void>;
  aoCancelar: () => void;
};

type Textos = {
  titulo: string;
  icone: NomeIcone;
  tom: 'perigo' | 'positivo';
  confirmar: string;
  rotuloMotivo?: string;
  exemploMotivo?: string;
};

const TEXTOS: Record<SituacaoFinal, Textos> = {
  REALIZADA: {
    titulo: 'Registrar a visita como realizada?',
    icone: 'sucesso',
    tom: 'positivo',
    confirmar: 'Registrar realização',
  },
  AUSENTE: {
    titulo: 'Registrar ausência na visita?',
    icone: 'alerta',
    tom: 'perigo',
    confirmar: 'Registrar ausência',
    rotuloMotivo: 'Motivo da ausência (opcional)',
    exemploMotivo: 'Ex.: participante não compareceu.',
  },
  CANCELADA: {
    titulo: 'Cancelar a visita?',
    icone: 'fechar',
    tom: 'perigo',
    confirmar: 'Cancelar visita',
    rotuloMotivo: 'Motivo do cancelamento (obrigatório)',
    exemploMotivo: 'Ex.: unidade de atendimento indisponível.',
  },
};

function consequencias(situacao: SituacaoFinal): ItemConsequencia[] {
  return [
    { texto: 'A visita deixa de estar agendada e não poderá mais ser reagendada.', tipo: 'perde' },
    situacao === 'REALIZADA'
      ? { texto: 'Os resultados das avaliações desta visita poderão ser lançados.', tipo: 'mantem' }
      : { texto: 'A mesma visita prevista poderá ser agendada novamente.', tipo: 'mantem' },
    { texto: 'Um registro errado pode ser corrigido depois, com justificativa.', tipo: 'mantem' },
  ];
}

// <-------------------REGISTRO DA SITUAÇÃO DA VISITA------------------->
// RF13: confirma a realização, a ausência ou o cancelamento de uma visita agendada. O motivo segue a
// regra do backend: obrigatório no cancelamento, opcional na ausência e ausente na realização
export default function DialogoRegistroVisita({ visita, situacao, aoRegistrar, aoCancelar }: Props) {
  const textos = TEXTOS[situacao];
  const pedeMotivo = regraMotivo(situacao) !== 'proibido';
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
    const erroLocal = pedeMotivo ? erroMotivoVisita(situacao, motivo) : undefined;
    if (erroLocal) {
      setErroCampo(erroLocal);
      campo.current?.focus();
      return;
    }

    setErroCampo(undefined);
    setEnviando(true);
    try {
      await aoRegistrar(pedeMotivo ? apararMotivo(motivo) : null);
    } catch (falha) {
      const doCampo = falha instanceof ErroRequisicao ? falha.errosCampos.motivo : undefined;
      if (doCampo && pedeMotivo) {
        setErroCampo(doCampo);
        focarCampo.current = true;
      } else {
        setErro(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível registrar a visita.');
      }
      setEnviando(false);
    }
  };

  return (
    <DialogoConfirmacao
      titulo={textos.titulo}
      descricao={`${visita.nomeVisita}, agendada para ${formatarDataHora(visita.dataHora)}.`}
      icone={textos.icone}
      tom={textos.tom}
      consequencias={consequencias(situacao)}
      textoConfirmar={textos.confirmar}
      erro={erro}
      enviando={enviando}
      aoConfirmar={confirmar}
      aoCancelar={aoCancelar}
    >
      {pedeMotivo && (
        <div className="campo">
          <label htmlFor="motivo-visita">{textos.rotuloMotivo}</label>
          <textarea
            ref={campo}
            id="motivo-visita"
            value={motivo}
            required={regraMotivo(situacao) === 'obrigatorio'}
            aria-invalid={Boolean(erroCampo)}
            aria-describedby={erroCampo ? 'erro-motivo-visita' : 'ajuda-motivo-visita'}
            disabled={enviando}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErroCampo(undefined);
            }}
            placeholder={textos.exemploMotivo}
          />
          <span className="campo-rodape">
            {erroCampo ? (
              <span id="erro-motivo-visita" className="campo-erro">
                {erroCampo}
              </span>
            ) : (
              <span id="ajuda-motivo-visita" className="campo-ajuda">
                Fica registrado no histórico. Até {LIMITE_TEXTO_VISITA} caracteres.
              </span>
            )}
            <span className="campo-contador">
              {motivo.trim().length}/{LIMITE_TEXTO_VISITA}
            </span>
          </span>
        </div>
      )}
    </DialogoConfirmacao>
  );
}
