import type { ContaParticipante, DadosInclusao } from '../../api/candidatos';
import type { Estudo } from '../../api/estudos';
import { formatarData, NOMES_ESTADO } from '../estudos/formatacao';
import { formatarDataHora, NOMES_CONSENTIMENTO, NOMES_ELEGIBILIDADE } from './formatacao';

// <-------------------CONDIÇÕES DA INCLUSÃO (RF11)------------------->
// A tela mostra e bloqueia o que já sabe, mas quem decide é a API, que confere tudo de novo

export type Condicao = { titulo: string; detalhe: string; atendida: boolean };

/** O e-mail é comparado sem diferença de maiúsculas, como no cadastro. */
export function mesmoEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** As seis condições do quadro "Condições para inclusão", na ordem do protótipo. */
export function condicoesInclusao(
  estudo: Estudo,
  dados: DadosInclusao,
  conta: ContaParticipante | undefined,
): Condicao[] {
  const { candidato, avaliadoEm, consentimentoEm, incluidos } = dados;
  const elegivel = candidato.elegibilidade === 'ELEGIVEL';
  const aceitou = candidato.consentimento === 'ACEITOU';
  const nomeConsentimento = NOMES_CONSENTIMENTO[candidato.consentimento].toLowerCase();
  const contaValida = conta !== undefined && mesmoEmail(conta.email, candidato.email);
  const preenchidas = `${incluidos} de ${estudo.limiteParticipantes} vagas preenchidas`;

  return [
    {
      titulo: 'Estudo em recrutamento',
      detalhe: estudo.estado === 'RECRUTAMENTO' ? estudo.titulo : `Estado atual: ${NOMES_ESTADO[estudo.estado]}`,
      atendida: estudo.estado === 'RECRUTAMENTO',
    },
    {
      titulo: 'Avaliação completa e elegível',
      detalhe:
        elegivel && avaliadoEm
          ? `Avaliado em ${formatarData(avaliadoEm.split('T')[0])}`
          : `Situação atual: ${NOMES_ELEGIBILIDADE[candidato.elegibilidade]}`,
      atendida: elegivel,
    },
    {
      titulo: `Consentimento: ${nomeConsentimento}`,
      detalhe: consentimentoEm ? `Registrado em ${formatarDataHora(consentimentoEm)}` : 'Ainda não registrado',
      atendida: aceitou,
    },
    {
      titulo: 'Conta com o mesmo e-mail do candidato',
      detalhe: !conta
        ? 'Escolha a conta de participante'
        : contaValida
          ? conta.email
          : `Conta: ${conta.email} • Candidato: ${candidato.email}`,
      atendida: contaValida,
    },
    {
      titulo: 'Sem inclusão anterior neste estudo',
      detalhe: candidato.dataInclusao
        ? `Incluído em ${formatarData(candidato.dataInclusao)}`
        : 'A pessoa ainda não participa deste estudo',
      atendida: !candidato.dataInclusao,
    },
    {
      titulo: 'Vaga disponível',
      detalhe: preenchidas,
      atendida: incluidos < estudo.limiteParticipantes,
    },
  ];
}
