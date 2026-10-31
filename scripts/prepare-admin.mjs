// Prepara SQL para revisão local; não cria conta nem executa operações remotas.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { z } from 'zod';

const file = process.argv[2];
if (!file)
  throw new Error(
    'Uso: npm run admin:prepare -- caminho/privado.json (ver docs/FASE_1.md).',
  );
const config = z
  .object({
    organization_id: z.uuid(),
    organization_name: z.string().trim().min(1).max(120),
    admin_email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
  })
  .strict()
  .parse(JSON.parse(await readFile(file, 'utf8')));
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
const sql = `-- Aplicar uma única vez, após revisar o banco/ambiente selecionado.
-- Não commitar este arquivo: contém o e-mail do administrador.
INSERT INTO organizations(id,name) VALUES(${quote(config.organization_id)},${quote(config.organization_name)});
INSERT INTO authorized_emails(email,organization_id,role) VALUES(${quote(config.admin_email)},${quote(config.organization_id)},'owner');
`;
await mkdir('.local', { recursive: true, mode: 0o700 });
await writeFile('.local/bootstrap.sql', sql, { flag: 'wx', mode: 0o600 });
console.log(
  'SQL preparado em .local/bootstrap.sql. Revise e aplique ao banco correto. Nenhum comando remoto executado.',
);
