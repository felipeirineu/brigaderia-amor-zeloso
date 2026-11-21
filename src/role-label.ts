/** Rótulo do papel na interface; "Desenvolvedor" é administrador de suporte. */
export function roleLabel(role: string, developer = false) {
  if (developer) return 'Desenvolvedor';
  return role === 'owner' ? 'Administrador' : 'Operador';
}
