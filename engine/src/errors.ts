import type { EngineErrorCode } from "./types.js";

const SAFE_MESSAGES: Record<EngineErrorCode, string> = {
  INVALID_TARGET: "La cible fournie est invalide.",
  INVALID_PROFILE: "Le profil réseau demandé n'est pas pris en charge.",
  BLOCKED_TARGET: "Cette cible ne peut pas être analysée.",
  ANALYSIS_TIMEOUT: "L'analyse a dépassé sa durée maximale.",
  NAVIGATION_FAILED: "La navigation vers le site a échoué.",
  ENGINE_UNAVAILABLE: "Le moteur d'analyse est indisponible.",
  ANALYSIS_CANCELLED: "L'analyse a été annulée.",
  ANALYSIS_FAILED: "L'analyse a échoué.",
};

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? SAFE_MESSAGES[code], options);
    this.name = "EngineError";
    this.code = code;
  }

  toSafeJSON(): { code: EngineErrorCode; message: string } {
    return { code: this.code, message: SAFE_MESSAGES[this.code] };
  }
}

export function isEngineError(value: unknown): value is EngineError {
  return value instanceof EngineError;
}
