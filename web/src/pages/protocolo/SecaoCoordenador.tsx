import { useEffect, useState, type FormEvent } from 'react';
import { ErroRequisicao } from '../../api/erros';
import type { Coordenador, Estudo, ServicoCoordenadores } from '../../api/estudos';
import Icone from '../../components/icones';

type Props = {
  estudo: Estudo;
  servico: ServicoCoordenadores;
  /** Recebe o estudo devolvido pela API depois da atribuição. */
  aoAtribuir(estudo: Estudo): void;
};

type Lista = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'pronta'; coordenadores: Coordenador[] };

// <-------------------COORDENADOR DO ESTUDO------------------->
// Aba Resumo: o pesquisador responsável atribui ou troca o único coordenador do estudo
// (PUT /estudos/{id}/coordenador). Vale em qualquer estado, menos Encerrado, e não remove o vínculo.
// Sem coordenador, o recrutamento não pode ser iniciado (quadro "Para iniciar o recrutamento").
export default function SecaoCoordenador({ estudo, servico, aoAtribuir }: Props) {
  const [lista, setLista] = useState<Lista>({ tipo: 'carregando' });
  const [escolha, setEscolha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();
  const encerrado = estudo.estado === 'ENCERRADO';

  useEffect(() => {
    let ativo = true;
    servico
      .listar()
      .then((coordenadores) => ativo && setLista({ tipo: 'pronta', coordenadores }))
      .catch(() => ativo && setLista({ tipo: 'erro' }));
    return () => {
      ativo = false;
    };
  }, [servico]);

  const coordenadores = lista.tipo === 'pronta' ? lista.coordenadores : [];
  const atual = coordenadores.find((c) => c.id === estudo.coordenadorId);
  // Conta desativada depois da atribuição: o vínculo continua, mas ela some da lista de opções
  const nomeAtual = atual?.nome ?? `Coordenador nº ${estudo.coordenadorId}`;
  const opcoes = coordenadores.filter((c) => c.id !== estudo.coordenadorId);
  const trocando = estudo.coordenadorId !== null;

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!escolha || salvando) return;
    setSalvando(true);
    setErro(undefined);
    try {
      const atualizado = await servico.atribuir(estudo.id, Number(escolha));
      setEscolha('');
      aoAtribuir(atualizado);
    } catch (falha) {
      setErro(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível atribuir o coordenador.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="estudos-cartao protocolo-bloco" aria-labelledby="secao-coordenador">
      <h2 id="secao-coordenador">Coordenador</h2>
      <p className="protocolo-coordenador">
        <Icone nome="usuario" />
        {estudo.coordenadorId === null ? (
          'Nenhum coordenador atribuído. Ele é necessário para iniciar o recrutamento.'
        ) : lista.tipo === 'carregando' ? (
          'Coordenador atribuído ao estudo.'
        ) : (
          <span>
            <strong>{nomeAtual}</strong> cadastra, avalia e inclui os candidatos deste estudo.
          </span>
        )}
      </p>

      {encerrado ? (
        <p className="campo-ajuda">Estudo encerrado: o coordenador não pode mais ser alterado.</p>
      ) : lista.tipo === 'carregando' ? (
        // Sem role="status": a região de notificação da página é a única que anuncia
        <p className="campo-ajuda">Carregando coordenadores…</p>
      ) : lista.tipo === 'erro' ? (
        <p className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" />
          Não foi possível carregar os coordenadores. Recarregue a página para tentar de novo.
        </p>
      ) : (
        <form className="protocolo-coordenador-form" onSubmit={enviar} noValidate>
          {erro && (
            <p className="aviso aviso-erro" role="alert">
              <Icone nome="alerta" />
              {erro}
            </p>
          )}
          <div className="campo">
            <label htmlFor="estudo-coordenador">{trocando ? 'Trocar por' : 'Coordenador'}</label>
            <div className="entrada-selecao">
              <select
                id="estudo-coordenador"
                aria-describedby="ajuda-coordenador"
                value={escolha}
                disabled={salvando || opcoes.length === 0}
                onChange={(e) => {
                  setEscolha(e.target.value);
                  setErro(undefined);
                }}
              >
                <option value="" disabled>
                  Selecione o coordenador
                </option>
                {opcoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <span className="campo-rodape">
              <span id="ajuda-coordenador" className="campo-ajuda">
                {opcoes.length === 0
                  ? trocando
                    ? 'Não há outro coordenador ativo para a troca.'
                    : 'Nenhum coordenador ativo: o administrador precisa cadastrar uma conta de coordenador.'
                  : trocando && estudo.estado !== 'PLANEJAMENTO'
                    ? 'O novo coordenador passa a cuidar dos candidatos já cadastrados.'
                    : 'Só aparecem contas ativas com perfil Coordenador.'}
              </span>
            </span>
          </div>
          <div className="estudos-acoes">
            <button type="submit" className="botao botao-primario" disabled={!escolha || salvando}>
              <Icone nome="usuarioCheck" />
              {salvando ? 'Salvando…' : trocando ? 'Trocar coordenador' : 'Atribuir coordenador'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
