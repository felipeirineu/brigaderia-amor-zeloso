// Alvo LOCAL para o OWASP ZAP no CI: app + API em Miniflare com D1 efêmero
// e fixtures fictícias. Nunca aponta para produção ou para o banco remoto.
import { runtime } from '../tests/helpers/runtime.mjs';
import { demoProject } from '../tests/helpers/demo-project.mjs';
const t = await runtime({
  browserHTTP: true,
  port: Number(process.env.ZAP_TARGET_PORT || 8788),
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  fieldEnabled: true,
});
await demoProject(t);
console.log('Alvo ZAP pronto em ' + t.url);
const stop = async () => {
  await t.dispose();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
