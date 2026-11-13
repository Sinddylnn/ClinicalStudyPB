import type { AtividadePrevista } from '../../api/protocolo';
import type { ResultadoAtividade } from '../../api/acompanhamento';

// <-------------------RESULTADOS DAS AVALIAÇÕES (RF14)------------------->
/** Limite do texto de cada resultado, depois de tirar os espaços das pontas. */
export const LIMITE_RESULTADO = 1000;

export const MENSAGEM_RESULTADO_LONGO = `O resultado pode ter até ${LIMITE_RESULTADO} caracteres.`;
export const MENSAGEM_RESULTADO_VAZIO = 'O resultado já registrado não pode ficar vazio.';

/** Regra do texto no backend: de 1 a 1.000 caracteres depois de aparar. */
export function erroTextoResultado(texto: string): string | undefined {
  const aparado = texto.trim();
  if (!aparado) return 'Informe o resultado.';
  if (aparado.length > LIMITE_RESULTADO) return MENSAGEM_RESULTADO_LONGO;
  return undefined;
}

/** O que salvar em cada atividade: novo resultado, edição de um existente ou nada. */
export type Envio =
  | { tipo: 'registrar'; atividadePrevistaId: number; texto: string }
  | { tipo: 'editar'; atividadePrevistaId: number; resultadoId: number; texto: string };

export type PlanoSalvamento = {
  envios: Envio[];
  /** Erro por atividade (chave: ID da atividade prevista). */
  erros: Record<number, string>;
};

/**
 * Compara o formulário com o que já está salvo. O preenchimento pode ser parcial: atividade sem
 * resultado e campo vazio fica de fora. Um resultado já registrado não pode ser apagado (o contrato
 * não tem exclusão), e texto igual ao salvo não gera chamada.
 */
export function planejarSalvamento(
  atividades: AtividadePrevista[],
  valores: Record<number, string>,
  salvos: ResultadoAtividade[],
): PlanoSalvamento {
  const envios: Envio[] = [];
  const erros: Record<number, string> = {};

  for (const atividade of atividades) {
    const texto = (valores[atividade.id] ?? '').trim();
    const salvo = salvos.find((r) => r.atividadePrevistaId === atividade.id);

    if (!salvo) {
      if (!texto) continue;
      if (texto.length > LIMITE_RESULTADO) erros[atividade.id] = MENSAGEM_RESULTADO_LONGO;
      else envios.push({ tipo: 'registrar', atividadePrevistaId: atividade.id, texto });
      continue;
    }

    if (texto === salvo.texto) continue;
    if (!texto) erros[atividade.id] = MENSAGEM_RESULTADO_VAZIO;
    else if (texto.length > LIMITE_RESULTADO) erros[atividade.id] = MENSAGEM_RESULTADO_LONGO;
    else envios.push({ tipo: 'editar', atividadePrevistaId: atividade.id, resultadoId: salvo.id, texto });
  }

  return { envios, erros };
}
