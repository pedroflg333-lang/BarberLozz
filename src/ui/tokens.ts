export const radius = {
  btn: '0.75rem',
  card: '1rem',
  modal: '1.5rem',
  full: '9999px',
} as const;

export const shadow = {
  card: '0 1px 2px rgba(0,0,0,0.04)',
  cardHover: '0 2px 8px rgba(0,0,0,0.06)',
  modal: '0 4px 16px rgba(0,0,0,0.08)',
  menu: '0 8px 32px rgba(0,0,0,0.10)',
} as const;

export const color = {
  brand: {
    gold: '#D4AF37',
    goldLight: '#F3E5AB',
    goldDark: '#AA7C11',
    obsidian: '#111111',
    obsidianLight: '#1A1A1A',
    platinum: '#F5F5F7',
    charcoal: '#2C2C2E',
  },
  surface: {
    default: '#ffffff',
    muted: '#F5F5F7',
    hover: '#EDEDF0',
    dark: '#111111',
    darkMuted: '#1A1A1A',
  },
  text: {
    primary: '#000000',
    secondary: '#737373',
    tertiary: '#A3A3A3',
    inverse: '#ffffff',
  },
  border: {
    default: '#E5E5E5',
    light: '#F0F0F0',
    dark: '#2C2C2E',
  },
  status: {
    success: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    errorBorder: '#FECACA',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
  },
} as const;

export const font = {
  family: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
} as const;

export const duration = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;

export const ease = {
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const transition = {
  fast: `all ${duration.fast} ${ease.outExpo}`,
  normal: `all ${duration.normal} ${ease.outExpo}`,
  slow: `all ${duration.slow} ${ease.outExpo}`,
} as const;
