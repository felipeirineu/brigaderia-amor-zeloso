import { z } from 'zod';
// CSP estrita no navegador: o zod não pode testar `new Function` (eval).
// Importado primeiro em main.tsx, antes de qualquer schema ser usado.
z.config({ jitless: true });
