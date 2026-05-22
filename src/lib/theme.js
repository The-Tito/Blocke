/**
 * lib/theme — tema claro/oscuro. Se persiste en localStorage y se aplica
 * añadiendo la clase `.dark` al <html> (modo de Tailwind por clase).
 */
const KEY = 'bloque:theme';

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch (_e) {
    return 'light';
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch (_e) {
    /* noop */
  }
}
