export const THEMES = [
    {
        id: 'original',
        label: 'Original',
        description: 'Palette bleue — thème par défaut',
        primary: '#2b8cee',
        accent: '#e879a8',
        bg: '#0a0e1a',
        surface: 'rgba(255,255,255,0.04)',
    },
    {
        id: 'dark-colored',
        label: 'Foncé Coloré',
        description: 'Palette lime & cyan — design Claude',
        primary: '#a3e635',
        accent: '#67e8f9',
        bg: '#0e0f12',
        surface: '#16181d',
    },
] as const;

export type ThemeId = typeof THEMES[number]['id'];
// Palette lime : le surlignage des menus (var(--primary-color)) est alors vert,
// cohérent avec les graphiques du dashboard qui utilisent déjà #a3e635.
export const DEFAULT_THEME: ThemeId = 'dark-colored';
export const THEME_COOKIE = 'rm_theme';
