import type { ServicoAcompanhamento } from './acompanhamento';
import { servicoAcompanhamentoSimulado } from './acompanhamentoSimulado';
import type { ServicoCandidatos } from './candidatos';
import { servicoCandidatosSimulado } from './candidatosSimulado';
import type { PainelEstudo, ServicoPainel } from './painel';

// <-------------------PAINEL SIMULADO------------------->
// Conta a partir dos serviços simulados de candidatos e de acompanhamento, para que o painel mostre
// os mesmos dados das outras telas, inclusive depois de uma inclusão, de um registro ou de uma retirada.
// Segue as regras de contagem do contrato (painel.ts); estudo inexistente responde 404 pelos serviços usados.
export function criarServicoPainelSimulado(
  candidatos: ServicoCandidatos,
  acompanhamento: ServicoAcompanhamento,
): ServicoPainel {
  return {
    async consultar(estudoId): Promise<PainelEstudo> {
      const [listaCandidatos, participacoes] = await Promise.all([
        candidatos.listar(estudoId),
        acompanhamento.listarParticipacoes(estudoId),
      ]);
      const visitas = (
        await Promise.all(participacoes.map((p) => acompanhamento.listarVisitas(estudoId, p.id)))
      ).flat();

      return {
        estudoId,
        candidatosCadastrados: listaCandidatos.length,
        participantesIncluidos: participacoes.length,
        participantesAtivos: participacoes.filter((p) => p.situacao === 'ATIVA').length,
        participantesRetirados: participacoes.filter((p) => p.situacao === 'RETIRADA').length,
        visitasRealizadas: visitas.filter((v) => v.situacao === 'REALIZADA').length,
        // Pendente é só AGENDADA, mesmo com a data já passada
        visitasPendentes: visitas.filter((v) => v.situacao === 'AGENDADA').length,
      };
    },
  };
}

export const servicoPainelSimulado = criarServicoPainelSimulado(
  servicoCandidatosSimulado,
  servicoAcompanhamentoSimulado,
);
