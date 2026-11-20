// Executa antes das folhas de estilo, sem script ou estilo inline (CSP).
(() => {
  const key = 'az-appearance';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => ['auto', 'light', 'dark'].includes(value);
  let preference = 'auto';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch {
    /* A aparência continua funcionando sem armazenamento. */
  }
  function apply() {
    const dark =
      preference === 'dark' || (preference === 'auto' && system.matches);
    root.dataset.appearance = preference;
    root.dataset.theme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#090605' : '#fcf6ec');
    document
      .querySelector('link[rel="manifest"]')
      ?.setAttribute(
        'href',
        dark ? '/manifest-dark.webmanifest' : '/manifest.webmanifest',
      );
    window.dispatchEvent(new Event('az-appearance-applied'));
  }
  window.addEventListener('az-appearance', (event) => {
    if (!valid(event.detail)) return;
    preference = event.detail;
    try {
      localStorage.setItem(key, preference);
    } catch {
      /* Só nesta abertura. */
    }
    apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      preference = valid(event.newValue) ? event.newValue : 'auto';
      apply();
    }
  });
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  apply();
})();
