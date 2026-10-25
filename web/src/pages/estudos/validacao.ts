// <-------------------REGRAS DO CADASTRO DE ESTUDO------------------->
// Mesmos limites da entidade Estudo e das restrições da migração V2 do backend.
// A web valida antes de enviar; o backend continua validando por conta própria.
export const LIMITES = {
  titulo: 150,
  objetivo: 2000,
} as const;

export type CampoEstudo = 'titulo' | 'objetivo' | 'dataInicio' | 'dataFim' | 'limiteParticipantes';

export type DadosEstudo = {
  titulo: string;
  objetivo: string;
  dataInicio: string;
  dataFim: string;
  limiteParticipantes: number | string;
};

export type ResultadoValidacao = {
  errosCampos: Partial<Record<CampoEstudo, string>>;
  /** Data de fim anterior à de início: no backend é a regra DATA_INVALIDA. */
  periodoInvalido: boolean;
};

// Texto do exemplo de DATA_INVALIDA no planejamento (seção 8.2)
export const MENSAGEM_PERIODO_INVALIDO = 'A data final deve ser igual ou posterior à inicial.';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validarTexto(valor: string, nome: string, maximo: number): string | undefined {
  if (valor.trim() === '') return `Informe ${nome.toLowerCase()}.`;
  if (valor.length > maximo) return `${nome} deve ter no máximo ${maximo} caracteres.`;
  return undefined;
}

function validarLimite(valor: number | string): string | undefined {
  if (valor === '' || valor === null || valor === undefined) {
    return 'Informe o limite de participantes.';
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return 'Informe um número inteiro maior que zero.';
  }
  return undefined;
}

/** Confere os campos do cadastro e o período previsto. */
export function validarEstudo(dados: DadosEstudo): ResultadoValidacao {
  const erros: ResultadoValidacao['errosCampos'] = {
    titulo: validarTexto(dados.titulo, 'O título', LIMITES.titulo),
    objetivo: validarTexto(dados.objetivo, 'O objetivo', LIMITES.objetivo),
    dataInicio: DATA_ISO.test(dados.dataInicio) ? undefined : 'Informe a data de início.',
    dataFim: DATA_ISO.test(dados.dataFim) ? undefined : 'Informe a data de término.',
    limiteParticipantes: validarLimite(dados.limiteParticipantes),
  };

  const errosCampos = Object.fromEntries(
    Object.entries(erros).filter(([, mensagem]) => mensagem !== undefined),
  ) as ResultadoValidacao['errosCampos'];

  // Datas AAAA-MM-DD podem ser comparadas como texto
  const periodoInvalido =
    !errosCampos.dataInicio && !errosCampos.dataFim && dados.dataFim < dados.dataInicio;

  return { errosCampos, periodoInvalido };
}
