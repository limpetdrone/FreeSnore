export const COLORS = {
  background: '#0B0E1B',
  surface: '#15192C',
  surfaceCard: '#1C223B',
  surfaceHighlight: '#262D4D',
  border: '#272F50',

  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',

  accent: '#A855F7',
  cyan: '#06B6D4',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Snore Intensity Colors
  quiet: '#10B981',       // Emerald - Quiet / No snore
  light: '#FBBF24',       // Amber - Light snore
  loud: '#F97316',        // Orange - Loud snore
  epic: '#EF4444',        // Crimson - Epic snore

  error: '#F43F5E',
  success: '#10B981',
};

export const SNORE_LEVELS = {
  quiet: { label: 'Csendes', minDb: 0, maxDb: 40, color: COLORS.quiet },
  light: { label: 'Halk', minDb: 40, maxDb: 52, color: COLORS.light },
  loud: { label: 'Hangos', minDb: 52, maxDb: 68, color: COLORS.loud },
  epic: { label: 'Erős / Epic', minDb: 68, maxDb: 100, color: COLORS.epic },
};
