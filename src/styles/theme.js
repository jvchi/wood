export const theme = {
  colors: {
    primary: '#1A1A1A',
    secondary: '#6B6560',
    accent: '#C9B99A',
    background: '#FFFFFF',
    surface: '#F5F0EB',
    surfaceMuted: '#F0EBE3',
    border: '#E8E4DF',
    white: '#FFFFFF',
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Inter', sans-serif",
  },
  fontSizes: {
    xs: '0.6875rem',    // 11px
    sm: '0.75rem',      // 12px
    base: '0.875rem',   // 14px
    md: '1rem',         // 16px
    lg: '1.125rem',     // 18px
    xl: '1.5rem',       // 24px
    '2xl': '2rem',      // 32px
    '3xl': '2.5rem',    // 40px
    '4xl': '3.5rem',    // 56px
    '5xl': '5rem',      // 80px
    hero: 'clamp(3rem, 8vw, 7rem)',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
    '4xl': '8rem',
    section: 'clamp(4rem, 10vw, 8rem)',
  },
  easing: {
    smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1440px',
  },
}
