/**
 * AI Roast App Theme - "Nuclear Night" (Flat Edition)
 */

export const theme = {
  colors: {
    // Backgrounds (Zinc Scale)
    background: "#09090b", // zinc-950
    surface: "#18181b", // zinc-900
    surfaceElevated: "#1f1f23",

    // Accents
    primary: "#ea580c", // orange-600
    secondary: "#a3e635", // lime-400

    // Status
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",

    // RGBA White Variants (Transparency/Glass)
    glass: {
      low: "rgba(0, 0, 0, 0.03)",
      medium: "rgba(0, 0, 0, 0.08)",
      high: "rgba(0, 0, 0, 0.15)",
      border: "rgba(0, 0, 0, 0.1)",
    },

    // UI Accents
    border: "rgba(0, 0, 0, 0.08)",
    divider: "rgba(0, 0, 0, 0.06)",
    overlay: "rgba(0, 0, 0, 0.6)",

    // Text Variants
    text: {
      primary: "rgba(0, 0, 0, 0.95)",
      secondary: "rgba(0, 0, 0, 0.5)",
      muted: "rgba(0, 0, 0, 0.3)",
      inverse: "#FFFFFF",
    },

    // Icon Variants
    icon: {
      primary: "rgba(0, 0, 0, 0.8)",
      muted: "rgba(0, 0, 0, 0.45)",
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
    full: 9999,
  },

  // Typography Scales (Generic System Fonts)
  typography: {
    size: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 20,
      xl: 24,
      xxl: 36,
      huge: 48,
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      xs: 16,
      sm: 20,
      base: 24,
      lg: 28,
      xl: 32,
      xxl: 44,
      huge: 56,
    },
  },
} as const;

export const AppTheme = theme;
