import type { FormEvent } from 'react';
import { Link } from 'react-router';
import Icone from '../../components/icones';
import { NOMES_PERFIL, PERFIS } from './formatacao';
import { SENHA_MINIMA, type CampoUsuario, type DadosUsuario, type ErrosUsuario } from './validacao';

type Props = {
  /** No cadastro há senha inicial; na edição, a situação da conta (só leitura). */
  modo: 'cadastro' | 'edicao';
  dados: DadosUsuario;
  erros: ErrosUsuario;
  erroGeral?: string;
  enviando: boolean;
  /** Situação mostrada na edição. */
  ativo?: boolean;
  alterar: (campo: CampoUsuario, valor: string) => void;
  aoEnviar: (evento: FormEvent<HTMLFormElement>) => void;
};

const AJUDA_PERFIL = 'Administrador, Pesquisador, Coordenador ou Participante.';

// Mesmo @Size(max = 255) do nome e do e-mail no backend
const LIMITE_TEXTO = 255;

// <-------------------FORMULÁRIO DE USUÁRIO------------------->
// Seções "Dados da conta" e "Acesso" dos quadros "Novo usuário" e "Editar usuário"
export default function FormularioUsuario({
  modo,
  dados,
  erros,
  erroGeral,
  enviando,
  ativo,
  alterar,
  aoEnviar,
}: Props) {
  const cadastro = modo === 'cadastro';

  const propsCampo = (campo: CampoUsuario, temAjuda = false) => ({
    id: `usuario-${campo}`,
    'aria-required': true,
    'aria-invalid': Boolean(erros[campo]),
    'aria-describedby': erros[campo] ? `erro-${campo}` : temAjuda ? `ajuda-${campo}` : undefined,
  });

  const rotulo = (campo: CampoUsuario, texto: string) => (
    // O asterisco vem do CSS; "obrigatório" já é anunciado pelo aria-required do campo
    <label className="obrigatorio" htmlFor={`usuario-${campo}`}>
      {texto}
    </label>
  );

  // O erro ocupa o lugar da ajuda, como no protótipo
  const rodape = (campo: CampoUsuario, ajuda?: string) => {
    if (erros[campo]) {
      return (
        <span className="campo-rodape">
          <span id={`erro-${campo}`} className="campo-erro">
            {erros[campo]}
          </span>
        </span>
      );
    }
    if (!ajuda) return null;
    return (
      <span className="campo-rodape">
        <span id={`ajuda-${campo}`} className="campo-ajuda">
          {ajuda}
        </span>
      </span>
    );
  };

  return (
    <form className="usuarios-cartao usuarios-formulario" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <p className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" />
          {erroGeral}
        </p>
      )}

      {/* <-------------------DADOS DA CONTA-------------------> */}
      <section className="usuarios-secao" aria-labelledby="secao-dados">
        <div className="usuarios-secao-texto">
          <h2 id="secao-dados">Dados da conta</h2>
          <p>Nome exibido no sistema e e-mail usado para entrar. O e-mail não pode se repetir.</p>
        </div>
        <div className="usuarios-secao-campos">
          <div className="campo">
            {rotulo('nome', 'Nome completo')}
            <input
              {...propsCampo('nome')}
              autoComplete="off"
              maxLength={LIMITE_TEXTO}
              placeholder="Ex.: Maria Souza"
              value={dados.nome}
              onChange={(e) => alterar('nome', e.target.value)}
            />
            {rodape('nome')}
          </div>

          <div className="campo">
            {rotulo('email', 'E-mail')}
            <div className="entrada-com-icone">
              <Icone nome="envelope" />
              <input
                {...propsCampo('email')}
                type="email"
                autoComplete="off"
                maxLength={LIMITE_TEXTO}
                placeholder="nome@exemplo.com"
                value={dados.email}
                onChange={(e) => alterar('email', e.target.value)}
              />
            </div>
            {rodape('email')}
          </div>
        </div>
      </section>

      <hr className="usuarios-divisoria" />

      {/* <-------------------ACESSO-------------------> */}
      <section className="usuarios-secao" aria-labelledby="secao-acesso">
        <div className="usuarios-secao-texto">
          <h2 id="secao-acesso">Acesso</h2>
          <p>
            {cadastro
              ? 'O perfil define o que a conta pode fazer. Informe a senha inicial ao usuário por um canal seguro.'
              : 'O perfil define o que a conta pode fazer. A senha não é alterada nesta tela.'}
          </p>
        </div>
        <div className="usuarios-secao-campos">
          {cadastro && (
            <div className="campo">
              {rotulo('senha', 'Senha inicial')}
              <div className="entrada-com-icone">
                <Icone nome="cadeado" />
                <input
                  {...propsCampo('senha')}
                  type="password"
                  autoComplete="new-password"
                  placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                  value={dados.senha}
                  onChange={(e) => alterar('senha', e.target.value)}
                />
              </div>
              {rodape('senha')}
            </div>
          )}

          <div className="campo">
            {rotulo('perfil', 'Perfil')}
            <div className="entrada-selecao">
              <select
                {...propsCampo('perfil', true)}
                value={dados.perfil}
                onChange={(e) => alterar('perfil', e.target.value)}
              >
                <option value="" disabled>
                  Selecione o perfil
                </option>
                {PERFIS.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {NOMES_PERFIL[perfil]}
                  </option>
                ))}
              </select>
              <Icone nome="setaBaixo" />
            </div>
            {rodape('perfil', AJUDA_PERFIL)}
          </div>

          {!cadastro && ativo !== undefined && (
            <p className="usuarios-situacao">
              <span className="usuarios-situacao-rotulo">Situação</span>
              <span className={`etiqueta ${ativo ? 'etiqueta-ativo' : 'etiqueta-inativo'}`}>
                {ativo ? 'Ativo' : 'Inativo'}
              </span>
              <span className="usuarios-situacao-ajuda">
                Para {ativo ? 'desativar' : 'reativar'}, use a ação na lista.
              </span>
            </p>
          )}
        </div>
      </section>

      <hr className="usuarios-divisoria" />

      <div className="usuarios-acoes">
        <Link className="botao botao-secundario" to="/usuarios">
          Cancelar
        </Link>
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          <Icone nome="sucesso" />
          {enviando ? 'Salvando…' : cadastro ? 'Salvar usuário' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
