type Props = {
  titulo: string;
  task: string;
};

// <-------------------PÁGINA PROVISÓRIA------------------->
// Marca rotas cuja tela ainda será implementada em outra task
export default function PaginaProvisoria({ titulo, task }: Props) {
  return (
    <main>
      <h1>{titulo}</h1>
      <p>Tela em construção ({task}).</p>
    </main>
  );
}