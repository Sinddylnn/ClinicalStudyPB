import { useEffect, useRef, useState } from 'react';
import type { CorrecaoVisitaEntrada, ResumoVisitaAgendada, SituacaoFinal } from '../../api/acompanhamento';
import { ErroRequisicao } from '../../api/erros';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import Icone from '../../components/icones';
import { formatarDataHora } from '../recrutamento/formatacao';
import { NOMES_SITUACAO_VISITA } from './historico';
import { LIMITE_TEXTO_VISITA, apararMotivo, erroJustificativa, erroMotivoVisita, regraMotivo } from './registroVisita';

type Props = {
  visita: ResumoVisitaAgendada;
  /** Situações permitidas para a correção (outras situações finais que a data aceita). */
  opcoes: SituacaoFinal[];
  /** Envia a correção com os textos aparados; se rejeitar, o erro aparece no diálogo. */
  aoCorrigir: (entrada: CorrecaoVisitaEntrada) => Promise<void>;
  aoCancelar: () => void;
};

type Campo = 'situacao' | 'justificativa' | 'motivo';
type Erros = Partial<Record<Campo, string>>;

const CONSEQUENCIAS: ItemConsequencia[] = [
  { texto: 'A situação atual é substituída pela nova; a visita não volta a ficar agendada.', tipo: 'perde' },
  { texto: 'A situação anterior, o motivo anterior e a justificativa ficam guardados na correção.', tipo: 'mantem' },
  { texto: 'A data agendada não muda.', tipo: 'mantem' },
];

const ROTULOS_MOTIVO: Record<SituacaoFinal, string> = {
  REALIZADA: '',
  AUSENTE: 'Motivo da ausência (opcional)',
  CANCELADA: 'Motivo do cancelamento (obrigatório)',
};

// <-------------------CORREÇÃO DA SITUAÇÃO DA VISITA------------------->
// RF13: troca uma situação final por outra, com justificativa obrigatória. O motivo segue a regra da
// nova situação; o motivo anterior não se perde, fica guardado na correção
export default function DialogoCorrecaoVisita({ visita, opcoes, aoCorrigir, aoCancelar }: Props) {
  const [situacao, setSituacao] = useState<SituacaoFinal | ''>('');
  const [justificativa, setJustificativa] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const campoSituacao = useRef<HTMLSelectElement>(null);
  const campoJustificativa = useRef<HTMLTextAreaElement>(null);
  const campoMotivo = useRef<HTMLTextAreaElement>(null);
  const focarDepois = useRef<Campo>(undefined);
  const pedeMotivo = situacao !== '' && regraMotivo(situacao) !== 'proibido';

  // Só em eventos e efeitos: as refs não são lidas durante a renderização
  const focar = (campo: Campo) => {
    const alvo = { situacao: campoSituacao, justificativa: campoJustificativa, motivo: campoMotivo }[campo];
    alvo.current?.focus();
  };

  // Os campos ficam desativados durante o envio: o foco só volta depois de reativados
  useEffect(() => {
    if (enviando || !focarDepois.current) return;
    focar(focarDepois.current);
    focarDepois.current = undefined;
  });

  const alterar = (campo: Campo) => {
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErro(undefined);
  };

  const confirmar = async () => {
    setErro(undefined);
    const encontrados: Erros = {};
    if (!situacao) encontrados.situacao = 'Selecione a nova situação.';
    const daJustificativa = erroJustificativa(justificativa);
    if (daJustificativa) encontrados.justificativa = daJustificativa;
    if (pedeMotivo) {
      const doMotivo = erroMotivoVisita(situacao, motivo);
      if (doMotivo) encontrados.motivo = doMotivo;
    }
    setErros(encontrados);
    const primeiro = (['situacao', 'justificativa', 'motivo'] as Campo[]).find((c) => encontrados[c]);
    if (primeiro || !situacao) {
      if (primeiro) focar(primeiro);
      return;
    }

    setEnviando(true);
    try {
      await aoCorrigir({
        situacao,
        justificativa: justificativa.trim(),
        motivo: pedeMotivo ? apararMotivo(motivo) : null,
      });
    } catch (falha) {
      const doCampo = falha instanceof ErroRequisicao ? falha.errosCampos : {};
      const vindos: Erros = {
        situacao: doCampo.situacao,
        justificativa: doCampo.justificativa,
        motivo: pedeMotivo ? doCampo.motivo : undefined,
      };
      const campoComErro = (['situacao', 'justificativa', 'motivo'] as Campo[]).find((c) => vindos[c]);
      if (campoComErro) {
        setErros(vindos);
        focarDepois.current = campoComErro;
      } else {
        setErro(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível registrar a correção.');
      }
      setEnviando(false);
    }
  };

  const descricao = `${visita.nomeVisita}, agendada para ${formatarDataHora(visita.dataHora)}, está registrada como ${NOMES_SITUACAO_VISITA[visita.situacao].toLowerCase()}.`;

  return (
    <DialogoConfirmacao
      titulo="Corrigir a situação da visita?"
      descricao={descricao}
      icone="lapis"
      tom="perigo"
      consequencias={CONSEQUENCIAS}
      aviso={
        visita.motivo && (
          <p className="aviso aviso-informacao">
            <Icone nome="info" />
            Motivo atual: {visita.motivo}
          </p>
        )
      }
      textoConfirmar="Salvar correção"
      erro={erro}
      enviando={enviando}
      aoConfirmar={confirmar}
      aoCancelar={aoCancelar}
    >
      <div className="campo">
        <label htmlFor="correcao-situacao" className="obrigatorio">
          Nova situação
        </label>
        <div className="entrada-selecao">
          <select
            ref={campoSituacao}
            id="correcao-situacao"
            value={situacao}
            disabled={enviando}
            aria-invalid={Boolean(erros.situacao)}
            aria-describedby={erros.situacao ? 'erro-correcao-situacao' : undefined}
            onChange={(e) => {
              setSituacao(e.target.value as SituacaoFinal | '');
              alterar('situacao');
              alterar('motivo');
            }}
          >
            <option value="">Selecione a situação</option>
            {opcoes.map((s) => (
              <option key={s} value={s}>
                {NOMES_SITUACAO_VISITA[s]}
              </option>
            ))}
          </select>
          <Icone nome="setaBaixo" />
        </div>
        {erros.situacao && (
          <span id="erro-correcao-situacao" className="campo-erro">
            {erros.situacao}
          </span>
        )}
      </div>

      <div className="campo">
        <label htmlFor="correcao-justificativa">Justificativa da correção (obrigatória)</label>
        <textarea
          ref={campoJustificativa}
          id="correcao-justificativa"
          value={justificativa}
          required
          aria-invalid={Boolean(erros.justificativa)}
          aria-describedby={erros.justificativa ? 'erro-correcao-justificativa' : 'ajuda-correcao-justificativa'}
          disabled={enviando}
          onChange={(e) => {
            setJustificativa(e.target.value);
            alterar('justificativa');
          }}
          placeholder="Ex.: a visita ocorreu, mas foi registrada como cancelada."
        />
        <span className="campo-rodape">
          {erros.justificativa ? (
            <span id="erro-correcao-justificativa" className="campo-erro">
              {erros.justificativa}
            </span>
          ) : (
            <span id="ajuda-correcao-justificativa" className="campo-ajuda">
              Explica por que o registro anterior estava errado. Até {LIMITE_TEXTO_VISITA} caracteres.
            </span>
          )}
          <span className="campo-contador">
            {justificativa.trim().length}/{LIMITE_TEXTO_VISITA}
          </span>
        </span>
      </div>

      {pedeMotivo && (
        <div className="campo">
          <label htmlFor="correcao-motivo">{ROTULOS_MOTIVO[situacao]}</label>
          <textarea
            ref={campoMotivo}
            id="correcao-motivo"
            value={motivo}
            required={regraMotivo(situacao) === 'obrigatorio'}
            aria-invalid={Boolean(erros.motivo)}
            aria-describedby={erros.motivo ? 'erro-correcao-motivo' : 'ajuda-correcao-motivo'}
            disabled={enviando}
            onChange={(e) => {
              setMotivo(e.target.value);
              alterar('motivo');
            }}
          />
          <span className="campo-rodape">
            {erros.motivo ? (
              <span id="erro-correcao-motivo" className="campo-erro">
                {erros.motivo}
              </span>
            ) : (
              <span id="ajuda-correcao-motivo" className="campo-ajuda">
                Substitui o motivo atual da visita. Até {LIMITE_TEXTO_VISITA} caracteres.
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
