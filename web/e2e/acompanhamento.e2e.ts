import { expect, test, type Page } from '@playwright/test';
import { dataRecife, prepararCenario, type Cenario } from './api';

// <-------------------E2E: AGENDAMENTO E REGISTRO DE VISITAS (RF12 e RF13)------------------->
// Fluxo do coordenador na web, com o backend real. Os prints ficam em test-results/capturas/.

let cenario: Cenario;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  cenario = await prepararCenario();
});

async function entrarComoCoordenador(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(cenario.coordenadorEmail);
  await page.locator('#login-senha').fill(cenario.coordenadorSenha);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function abrirAgendamento(page: Page) {
  await page.goto(`/estudos/${cenario.estudoId}/participacoes`);
  await expect(page.getByRole('heading', { name: 'Participantes incluídos' })).toBeVisible();
  await page.getByRole('link', { name: `Agendar visitas de ${cenario.participanteNome}` }).click();
  await expect(page.getByRole('heading', { name: 'Agendamento de visitas' })).toBeVisible();
}

async function preencherAgendamento(page: Page, data: string, hora: string) {
  await page.locator('#agendamento-visita').selectOption({ label: cenario.visitaPrevista });
  await page.locator('#agendamento-data').fill(data);
  await page.locator('#agendamento-hora').fill(hora);
}

const capturar = (page: Page, nome: string) =>
  page.screenshot({ path: `test-results/capturas/${nome}.png`, fullPage: true });

test('coordenador agenda uma visita e registra a realização', async ({ page }) => {
  await entrarComoCoordenador(page);
  await abrirAgendamento(page);

  // Agendamento (hoje, para que a visita já possa ser registrada)
  await preencherAgendamento(page, dataRecife(0), '09:00');
  await capturar(page, '01-rf12-e2e-agendamento-preenchido');
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).click();

  await expect(page.getByRole('status')).toContainText(`${cenario.visitaPrevista} agendada para`);
  const visita = page.getByRole('listitem').filter({ hasText: cenario.visitaPrevista });
  await expect(visita).toContainText(/agendada/i);
  await capturar(page, '02-rf12-e2e-agendamento-sucesso');

  // Registro da realização
  await page.getByRole('button', { name: new RegExp(`^Registrar realização da ${cenario.visitaPrevista}`) }).click();
  await expect(page.getByText('Registrar a visita como realizada?')).toBeVisible();
  await capturar(page, '03-rf13-e2e-registro-dialogo');
  await page.getByRole('button', { name: 'Registrar realização', exact: true }).click();

  await expect(page.getByRole('status')).toContainText(`${cenario.visitaPrevista} registrada como realizada.`);
  await expect(visita).toContainText(/realizada/i);
  await capturar(page, '04-rf13-e2e-registro-sucesso');
});

test('recusa agendar com data anterior a hoje', async ({ page }) => {
  await entrarComoCoordenador(page);
  await abrirAgendamento(page);

  await preencherAgendamento(page, dataRecife(-1), '09:00');
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).click();

  await expect(page.getByText('A data da visita não pode ser anterior a hoje.')).toBeVisible();
  await capturar(page, '05-rf12-e2e-agendamento-erro-data');
});

test('recusa agendar uma visita prevista que já está agendada', async ({ page }) => {
  await entrarComoCoordenador(page);
  await abrirAgendamento(page);

  // A visita do primeiro cenário já foi realizada, então um novo agendamento é aceito
  await preencherAgendamento(page, dataRecife(0), '10:00');
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`${cenario.visitaPrevista} agendada para`);

  // O segundo agendamento da mesma visita enquanto o primeiro está pendente é recusado pelo backend
  await preencherAgendamento(page, dataRecife(0), '11:00');
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).click();
  await expect(page.getByText('Já existe um agendamento pendente para essa visita.')).toBeVisible();
  await capturar(page, '06-rf12-e2e-agendamento-erro-duplicado');
});
