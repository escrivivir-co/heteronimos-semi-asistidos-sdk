export function describeTelegramError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      error_code?: number;
      description?: string;
      message?: string;
    };

    if (typeof maybeError.description === "string" && typeof maybeError.error_code === "number") {
      return `${maybeError.error_code}: ${maybeError.description}`;
    }

    if (typeof maybeError.description === "string") {
      return maybeError.description;
    }

    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return String(error);
}