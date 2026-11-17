export type Appearance = 'auto' | 'light' | 'dark';
export function appearance(): Appearance {
  const value = document.documentElement.dataset.appearance;
  return value === 'dark' || value === 'light' ? value : 'auto';
}
export function changeAppearance(value: Appearance) {
  window.dispatchEvent(new CustomEvent('az-appearance', { detail: value }));
}
