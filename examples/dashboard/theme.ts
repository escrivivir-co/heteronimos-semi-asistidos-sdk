/**
 * Paleta mínima de la dashboard. Un solo objeto para que todos los componentes
 * usen los mismos colores sin importar chalk directamente.
 */
export const theme = {
  /** Color principal — encabezados, valores activos */
  primary: "cyan" as const,
  /** Color de títulos de panel */
  title: "blueBright" as const,
  /** Éxito / online */
  success: "green" as const,
  /** Advertencia / warn */
  warning: "yellow" as const,
  /** Error / offline */
  error: "red" as const,
  /** Texto secundario / muted */
  muted: "gray" as const,
  /** Texto de debug */
  debug: "gray" as const,
  /** Bordes y separadores */
  border: "gray" as const,
} as const;

export type ThemeColor = (typeof theme)[keyof typeof theme];

/** Mapeo de LogLevel → color */
export const LOG_LEVEL_COLOR: Record<"debug" | "info" | "warn" | "error", ThemeColor> = {
  debug: theme.debug,
  info:  theme.primary,
  warn:  theme.warning,
  error: theme.error,
};
