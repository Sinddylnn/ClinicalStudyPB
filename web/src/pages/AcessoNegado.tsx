import PaginaErro from '../components/PaginaErro';

// Para onde a RotaProtegida leva quem não tem o perfil da rota (403 ACESSO_NEGADO)
export default function AcessoNegado() {
  return (
    <PaginaErro
      codigo="Erro 403"
      titulo="Acesso negado"
      mensagem="Seu perfil não tem permissão para acessar esta página. Se acredita que isso é um erro, fale com o administrador."
      icone="escudoAlerta"
      tom="perigo"
    />
  );
}
