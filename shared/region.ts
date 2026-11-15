/**
 * Região de atendimento usada para filtrar sugestões de endereço.
 * Paraíba, com pequena margem nas bordas; resultados marcados com outro
 * estado são descartados mesmo dentro da margem.
 * Formato do bbox: [oeste, sul, leste, norte] (longitude/latitude).
 */
export const serviceRegion = {
  state: 'Paraíba',
  bbox: [-38.9, -8.4, -34.7, -5.9] as const,
};
