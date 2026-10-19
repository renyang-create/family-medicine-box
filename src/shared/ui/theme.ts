/** 设计 token。MVP 固定浅色主题，暗色模式放 P2（见 app.config.ts 的 userInterfaceStyle）。 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F7F8FA',
  border: '#E4E7EC',
  text: '#101828',
  textMuted: '#667085',
  textSubtle: '#98A2B3',
  primary: '#1570EF',
  primaryPressed: '#175CD3',
  onPrimary: '#FFFFFF',
  danger: '#D92D20',
  dangerText: '#B42318',
  dangerBackground: '#FEF3F2',
  warning: '#F79009',
  warningText: '#B54708',
  warningBackground: '#FEF0C7',
  success: '#12B76A',
  overlay: 'rgba(16, 24, 40, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  hero: 28,
} as const;
