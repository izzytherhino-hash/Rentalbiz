/**
 * Partay Rentals - Theme Configuration
 *
 * Centralized design system based on Drybar.com aesthetic.
 * Use these constants throughout the application for consistency.
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    yellow: '#FBBF24',      // yellow-400 - Main brand color
    yellowHover: '#F59E0B', // yellow-500 - Hover state
    yellowLight: '#FEF3C7', // yellow-50 - Light backgrounds
  },

  // Text Colors
  text: {
    primary: '#1F2937',   // gray-800 - Main text
    secondary: '#4B5563', // gray-600 - Secondary text
    tertiary: '#6B7280',  // gray-500 - Tertiary/placeholder text
    light: '#9CA3AF',     // gray-400 - Very light text
  },

  // Background Colors
  background: {
    white: '#FFFFFF',
    light: '#F9FAFB',     // gray-50
    medium: '#F3F4F6',    // gray-100
  },

  // Border Colors
  border: {
    light: '#E5E7EB',     // gray-200
    medium: '#D1D5DB',    // gray-300
    dark: '#9CA3AF',      // gray-400
  },

  // Status Colors
  status: {
    success: '#10B981',      // green-500
    successLight: '#D1FAE5', // green-100
    warning: '#F59E0B',      // yellow-500
    warningLight: '#FEF3C7', // yellow-100
    error: '#EF4444',        // red-500
    errorLight: '#FEE2E2',   // red-100
    info: '#3B82F6',         // blue-500
    infoLight: '#DBEAFE',    // blue-100
  },
}

export const typography = {
  // Font Families
  fontFamily: {
    serif: '"Playfair Display", Georgia, serif',  // For headings
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
}

export const spacing = {
  // Standard spacing scale (matches Tailwind)
  px: '1px',
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
}

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}

// Component-specific styles
export const components = {
  button: {
    primary: `bg-[${colors.primary.yellow}] text-[${colors.text.primary}] hover:bg-[${colors.primary.yellowHover}]
              font-medium tracking-wider uppercase transition-all`,
    secondary: `bg-transparent border-2 border-[${colors.border.medium}] text-[${colors.text.primary}]
                hover:border-[${colors.primary.yellow}] hover:text-[${colors.primary.yellow}]
                font-medium tracking-wider uppercase transition-all`,
    ghost: `bg-transparent text-[${colors.text.secondary}] hover:text-[${colors.text.primary}] transition-colors`,
  },

  input: {
    base: `border border-[${colors.border.light}] rounded-md px-3 py-2
           focus:ring-2 focus:ring-[${colors.primary.yellow}] focus:border-transparent
           text-[${colors.text.primary}] placeholder:text-[${colors.text.tertiary}]`,
  },

  heading: {
    h1: `font-serif text-4xl font-light text-[${colors.text.primary}]`,
    h2: `font-serif text-3xl font-light text-[${colors.text.primary}]`,
    h3: `font-serif text-2xl font-light text-[${colors.text.primary}]`,
    h4: `font-serif text-xl font-light text-[${colors.text.primary}]`,
  },

  card: {
    base: `bg-white border-2 border-[${colors.border.light}] rounded-lg
           hover:border-[${colors.primary.yellow}] transition-all`,
    shadow: `bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow`,
  },

  badge: {
    success: `bg-[${colors.status.successLight}] text-green-800 px-2 py-1 rounded text-xs`,
    warning: `bg-[${colors.status.warningLight}] text-yellow-800 px-2 py-1 rounded text-xs`,
    error: `bg-[${colors.status.errorLight}] text-red-800 px-2 py-1 rounded text-xs`,
    info: `bg-[${colors.status.infoLight}] text-blue-800 px-2 py-1 rounded text-xs`,
  },

  label: {
    base: `text-sm font-medium text-[${colors.text.secondary}] uppercase tracking-wide`,
  },
}

// Transition presets
export const transitions = {
  fast: 'transition-all duration-150 ease-in-out',
  normal: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
}

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  transitions,
}
