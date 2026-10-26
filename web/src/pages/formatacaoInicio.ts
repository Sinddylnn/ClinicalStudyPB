// <-------------------DATA DO INÍCIO------------------->
const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "Segunda-feira, 26 de outubro de 2026", como no subtítulo do protótipo. */
export function formatarHoje(data: Date): string {
  const texto = FORMATO_DATA.format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
