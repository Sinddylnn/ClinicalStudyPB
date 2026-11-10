import { useCallback, useState } from 'react';
import { ErroRequisicao } from '../../api/erros';
import type {
  AtividadePrevista,
  ServicoProtocolo,
  VisitaPrevista,
  VisitaPrevistaEntrada,
} from '../../api/protocolo';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import Icone from '../../components/icones';
import CartaoVisita, { type EdicaoVisitas } from './CartaoVisita';
import { tituloVisita } from './formatacao';
import FormularioVisita from './FormularioVisita';

type Props = {
  estudoId: number;
  visitas: VisitaPrevista[];
  /** false fora de Planejamento: as visitas ficam só para consulta. */
  editavel: boolean;
  servico: ServicoProtocolo;
  /** Aplica a mudança às visitas já carregadas na tela, sem buscar tudo de novo. */
  aoAlterarVisitas: (alterar: (visitas: VisitaPrevista[]) => VisitaPrevista[]) => void;
  aoNotificar: (mensagem: string) => void;
};

type Remocao = { visita: VisitaPrevista; atividade?: AtividadePrevista };

const emOrdem = (visitas: VisitaPrevista[]) => [...visitas].sort((a, b) => a.ordem - b.ordem);

// Modelagem, seção 4.2: a remoção da visita leva as atividades junto, então o diálogo avisa quantas
function consequenciasVisita(visita: VisitaPrevista): ItemConsequencia[] {
  const quantidade = visita.atividades.length;
  const atividades: ItemConsequencia =
    quantidade === 0
      ? { texto: 'A visita não tem atividades cadastradas.', tipo: 'mantem' }
      : quantidade === 1
        ? { texto: 'A atividade desta visita também será removida.', tipo: 'perde' }
        : { texto: `As ${quantidade} atividades desta visita também serão removidas.`, tipo: 'perde' };
  return [
    { texto: 'A visita sai do protocolo do estudo.', tipo: 'perde' },
    atividades,
    { texto: 'As demais visitas mantêm a ordem atual.', tipo: 'mantem' },
  ];
}

const consequenciasAtividade = (visita: VisitaPrevista): ItemConsequencia[] => [
  { texto: `A atividade sai da visita “${visita.nome}”.`, tipo: 'perde' },
  { texto: 'As demais atividades continuam como estão.', tipo: 'mantem' },
];

// <-------------------VISITAS PREVISTAS------------------->
// Aba Visitas (T46): os modelos de visita do protocolo, em ordem, com as atividades de cada um.
// Em Planejamento o pesquisador adiciona, edita e remove; editar e remover só aparecem quando o
// backend em uso oferece essas rotas (recursos.editarRemover)
export default function ListaVisitas({
  estudoId,
  visitas,
  editavel,
  servico,
  aoAlterarVisitas,
  aoNotificar,
}: Props) {
  const [edicao, setEdicao] = useState<EdicaoVisitas | null>(null);
  const [remocao, setRemocao] = useState<Remocao>();
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState<string>();
  const { editarRemover } = servico.recursos;
  // Próxima ordem sugerida: a maior já usada + 1 (intervalos são permitidos)
  const proximaOrdem = Math.max(0, ...visitas.map((v) => v.ordem)) + 1;

  const trocarVisita = (alterada: VisitaPrevista) =>
    aoAlterarVisitas((atuais) => emOrdem(atuais.map((v) => (v.id === alterada.id ? alterada : v))));

  const adicionarVisita = async (entrada: VisitaPrevistaEntrada) => {
    const nova = await servico.adicionarVisita(estudoId, entrada);
    aoAlterarVisitas((atuais) => emOrdem([...atuais, nova]));
    setEdicao(null);
    aoNotificar('Visita adicionada.');
  };

  const editarVisita = (visita: VisitaPrevista) => async (entrada: VisitaPrevistaEntrada) => {
    const editada = await servico.editarVisita(estudoId, visita.id, entrada);
    trocarVisita({ ...editada, atividades: editada.atividades ?? visita.atividades });
    setEdicao(null);
    aoNotificar('Visita atualizada.');
  };

  const adicionarAtividade = (visita: VisitaPrevista) => async (descricao: string) => {
    const nova = await servico.adicionarAtividade(estudoId, visita.id, descricao);
    aoAlterarVisitas((atuais) =>
      atuais.map((v) => (v.id === visita.id ? { ...v, atividades: [...v.atividades, nova] } : v)),
    );
    aoNotificar('Atividade adicionada.');
  };

  const editarAtividade = (visita: VisitaPrevista) => async (atividade: AtividadePrevista, descricao: string) => {
    const editada = await servico.editarAtividade(estudoId, visita.id, atividade.id, descricao);
    aoAlterarVisitas((atuais) =>
      atuais.map((v) =>
        v.id === visita.id
          ? { ...v, atividades: v.atividades.map((a) => (a.id === editada.id ? editada : a)) }
          : v,
      ),
    );
    aoNotificar('Atividade atualizada.');
  };

  const pedirRemocao = (pedido: Remocao) => {
    setErroRemocao(undefined);
    setRemocao(pedido);
  };

  const fecharRemocao = useCallback(() => setRemocao(undefined), []);

  const confirmarRemocao = async () => {
    if (!remocao) return;
    const { visita, atividade } = remocao;
    setRemovendo(true);
    setErroRemocao(undefined);
    try {
      if (atividade) {
        await servico.removerAtividade(estudoId, visita.id, atividade.id);
        aoAlterarVisitas((atuais) =>
          atuais.map((v) =>
            v.id === visita.id ? { ...v, atividades: v.atividades.filter((a) => a.id !== atividade.id) } : v,
          ),
        );
      } else {
        await servico.removerVisita(estudoId, visita.id);
        aoAlterarVisitas((atuais) => atuais.filter((v) => v.id !== visita.id));
      }
      setRemocao(undefined);
      aoNotificar(atividade ? 'Atividade removida.' : 'Visita removida.');
    } catch (erro) {
      const padrao = atividade ? 'Não foi possível remover a atividade.' : 'Não foi possível remover a visita.';
      setErroRemocao(erro instanceof ErroRequisicao ? erro.message : padrao);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      {editavel && edicao?.tipo !== 'nova-visita' && (
        <div className="protocolo-visitas-acoes">
          <button type="button" className="botao botao-primario" onClick={() => setEdicao({ tipo: 'nova-visita' })}>
            <Icone nome="mais" />
            Adicionar visita
          </button>
        </div>
      )}

      {edicao?.tipo === 'nova-visita' && (
        <section className="estudos-cartao protocolo-cartao protocolo-visita-edicao" aria-labelledby="titulo-nova-visita">
          <h3 id="titulo-nova-visita" className="protocolo-visita-titulo-formulario">
            Nova visita
          </h3>
          <FormularioVisita
            id="visita-nova"
            titulo="Nova visita"
            inicial={{ nome: '', descricao: null, ordem: proximaOrdem }}
            textoSalvar="Adicionar visita"
            aoSalvar={adicionarVisita}
            aoCancelar={() => setEdicao(null)}
          />
        </section>
      )}

      {visitas.length === 0 && edicao?.tipo !== 'nova-visita' && (
        <p className="estudos-cartao protocolo-vazio-cartao">Nenhuma visita cadastrada.</p>
      )}

      {visitas.length > 0 && (
        <div className="protocolo-visitas">
          {visitas.map((visita) => (
            <CartaoVisita
              key={visita.id}
              visita={visita}
              editavel={editavel}
              editarRemover={editarRemover}
              edicao={edicao}
              aoAbrir={setEdicao}
              aoSalvarVisita={editarVisita(visita)}
              aoAdicionarAtividade={adicionarAtividade(visita)}
              aoEditarAtividade={editarAtividade(visita)}
              aoPedirRemocaoVisita={() => pedirRemocao({ visita })}
              aoPedirRemocaoAtividade={(atividade) => pedirRemocao({ visita, atividade })}
            />
          ))}
        </div>
      )}

      {remocao && (
        <DialogoConfirmacao
          titulo={remocao.atividade ? 'Remover atividade?' : 'Remover visita?'}
          descricao={`“${remocao.atividade ? remocao.atividade.descricao : tituloVisita(remocao.visita)}”`}
          icone="lixeira"
          tom="perigo"
          consequencias={
            remocao.atividade ? consequenciasAtividade(remocao.visita) : consequenciasVisita(remocao.visita)
          }
          textoConfirmar={remocao.atividade ? 'Remover atividade' : 'Remover visita'}
          erro={erroRemocao}
          enviando={removendo}
          aoConfirmar={confirmarRemocao}
          aoCancelar={fecharRemocao}
        />
      )}
    </>
  );
}
