import { useEffect, useRef, useState } from 'react';
import { ErroRequisicao } from '../../api/erros';
import type { AlteracaoEstadoEntrada, EstadoEstudo, Estudo } from '../../api/estudos';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import type { NomeIcone } from '../../components/icones';
import { NOMES_ESTADO } from '../estudos/formatacao';
import {
  encerramentoAntecipado,
  LIMITE_JUSTIFICATIVA,
  normalizarJustificativa,
  validarJustificativa,
} from '../estudos/transicoes';
import { ACOES_ESTADO } from './formatacao';

export type DestinoEstado = Exclude<EstadoEstudo, 'PLANEJAMENTO'>;

type Props = {
  estudo: Estudo;
  destino: DestinoEstado;
  /** Envia a mudança; se rejeitar, a mensagem aparece no diálogo e o estado exibido não muda. */
  aoAlterar: (entrada: AlteracaoEstadoEntrada) => Promise<void>;
  aoCancelar: () => void;
};

type Mudanca = {
  titulo: string;
  icone: NomeIcone;
  tom: 'perigo' | 'positivo';
  consequencias: ItemConsequencia[];
};

// Consequências de cada mudança (modelagem, seções 4 e 6); nenhuma pode ser desfeita
const MUDANCAS: Record<DestinoEstado, Mudanca> = {
  RECRUTAMENTO: {
    titulo: 'Iniciar o recrutamento?',
    icone: 'usuarioMais',
    tom: 'positivo',
    consequencias: [
      { texto: 'O protocolo fica somente para consulta: os critérios não podem mais ser alterados.', tipo: 'perde' },
      { texto: 'Não é possível voltar ao planejamento.', tipo: 'perde' },
      { texto: 'O coordenador passa a cadastrar, avaliar e incluir candidatos.', tipo: 'mantem' },
    ],
  },
  EXECUCAO: {
    titulo: 'Iniciar a execução?',
    icone: 'atividade',
    tom: 'positivo',
    consequencias: [
      { texto: 'Novas inclusões de participantes ficam bloqueadas.', tipo: 'perde' },
      { texto: 'Não é possível voltar ao recrutamento.', tipo: 'perde' },
      { texto: 'Os participantes já incluídos continuam no estudo.', tipo: 'mantem' },
    ],
  },
  ENCERRADO: {
    titulo: 'Encerrar o estudo?',
    icone: 'cadeado',
    tom: 'perigo',
    consequencias: [
      { texto: 'O encerramento não pode ser desfeito: o estudo não pode ser reaberto.', tipo: 'perde' },
      { texto: 'O estudo deixa de aceitar alterações.', tipo: 'perde' },
      { texto: 'Os dados e o histórico continuam disponíveis para consulta.', tipo: 'mantem' },
    ],
  },
};

const CAMPO_JUSTIFICATIVA = 'justificativaEncerramento';

// <-------------------CONFIRMAÇÃO DA MUDANÇA DE ESTADO------------------->
// A tela mantém o estado exibido até o backend confirmar (modelagem, seção 7). No encerramento,
// pede a justificativa com as mesmas regras do backend: obrigatória antes da execução, até 500 caracteres
export default function DialogoMudancaEstado({ estudo, destino, aoAlterar, aoCancelar }: Props) {
  const mudanca = MUDANCAS[destino];
  const pedeJustificativa = destino === 'ENCERRADO';
  const obrigatoria = pedeJustificativa && encerramentoAntecipado(estudo.estado);
  const [justificativa, setJustificativa] = useState('');
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
    const erroLocal = pedeJustificativa ? validarJustificativa(estudo.estado, destino, justificativa) : undefined;
    if (erroLocal) {
      setErroCampo(erroLocal);
      campo.current?.focus();
      return;
    }

    setEnviando(true);
    try {
      await aoAlterar(
        pedeJustificativa
          ? { estado: destino, justificativaEncerramento: normalizarJustificativa(justificativa) }
          : { estado: destino },
      );
    } catch (falha) {
      const doCampo = falha instanceof ErroRequisicao ? falha.errosCampos[CAMPO_JUSTIFICATIVA] : undefined;
      if (doCampo && pedeJustificativa) {
        setErroCampo(doCampo);
        focarCampo.current = true;
      } else {
        setErro(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível alterar o estado do estudo.');
      }
      setEnviando(false);
    }
  };

  const alterarJustificativa = (texto: string) => {
    setJustificativa(texto);
    setErroCampo(undefined);
  };

  return (
    <DialogoConfirmacao
      titulo={mudanca.titulo}
      descricao={`“${estudo.titulo}” passa de ${NOMES_ESTADO[estudo.estado]} para ${NOMES_ESTADO[destino]}.`}
      icone={mudanca.icone}
      tom={mudanca.tom}
      consequencias={mudanca.consequencias}
      textoConfirmar={ACOES_ESTADO[destino]}
      erro={erro}
      enviando={enviando}
      aoConfirmar={confirmar}
      aoCancelar={aoCancelar}
    >
      {pedeJustificativa && (
        <div className="campo">
          <label htmlFor="justificativa-encerramento">
            {obrigatoria ? 'Justificativa (obrigatória)' : 'Justificativa (opcional)'}
          </label>
          <textarea
            ref={campo}
            id="justificativa-encerramento"
            value={justificativa}
            required={obrigatoria}
            aria-invalid={Boolean(erroCampo)}
            aria-describedby={erroCampo ? 'erro-justificativa' : 'ajuda-justificativa'}
            disabled={enviando}
            onChange={(e) => alterarJustificativa(e.target.value)}
            placeholder={
              obrigatoria
                ? 'Ex.: estudo cancelado antes da inclusão de participantes.'
                : 'Ex.: acompanhamento dos participantes concluído.'
            }
          />
          <span className="campo-rodape">
            {erroCampo ? (
              <span id="erro-justificativa" className="campo-erro">
                {erroCampo}
              </span>
            ) : (
              <span id="ajuda-justificativa" className="campo-ajuda">
                {obrigatoria
                  ? `Explique por que o estudo será encerrado antes da execução. Até ${LIMITE_JUSTIFICATIVA} caracteres.`
                  : `Até ${LIMITE_JUSTIFICATIVA} caracteres.`}
              </span>
            )}
            <span className="campo-contador">
              {justificativa.length}/{LIMITE_JUSTIFICATIVA}
            </span>
          </span>
        </div>
      )}
    </DialogoConfirmacao>
  );
}
