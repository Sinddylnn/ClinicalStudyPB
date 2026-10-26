import PaginaErro from '../components/PaginaErro';

// Endereço que não corresponde a nenhuma rota da aplicação
export default function NaoEncontrada() {
  return (
    <PaginaErro
      codigo="Erro 404"
      titulo="Página não encontrada"
      mensagem="O endereço que você tentou abrir não existe ou mudou. Confira o link ou volte ao início."
      icone="busca"
      tom="neutro"
    />
  );
}
