export async function selectWorkday(page, day) {
  await page.getByRole('button', { name: 'Escolher dia', exact: true }).click();
  const sheet = page.getByRole('dialog', {
    name: 'Escolher dia de trabalho',
    exact: true,
  });
  await sheet.getByLabel('Ir para data', { exact: true }).fill(day);
  await sheet.getByRole('button', { name: 'Ver dia', exact: true }).click();
}
