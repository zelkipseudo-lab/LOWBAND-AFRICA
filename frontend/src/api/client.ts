import type {
  AnalysisReport,
  AnalysisRequest,
  ApiErrorCode,
  ApiErrorEnvelope,
  HealthResponse,
  HistoryListResponse,
} from "../types/api";

const BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  ""
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly requestId?: string;
  readonly statusCode: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode: number,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/health`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as HealthResponse;
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function runAnalysis(
  requestData: AnalysisRequest,
  signal?: AbortSignal
): Promise<AnalysisReport> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "ANALYSIS_TIMEOUT",
        "La requête a été interrompue ou a expiré.",
        0
      );
    }
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur backend. Vérifiez que le serveur est démarré.",
      0
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data: unknown;
  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Format inattendu : ${text.slice(0, 100)}`);
    }
  } catch {
    throw new ApiError(
      "UNKNOWN_ERROR",
      `Réponse inattendue du serveur (${response.status}).`,
      response.status
    );
  }

  if (!response.ok) {
    const errorBody = data as ApiErrorEnvelope;
    if (errorBody && errorBody.error && errorBody.error.code) {
      throw new ApiError(
        errorBody.error.code,
        errorBody.error.message || getFallbackErrorMessage(errorBody.error.code),
        response.status,
        errorBody.error.requestId
      );
    }
    throw new ApiError(
      "UNKNOWN_ERROR",
      `Erreur serveur inattendue (${response.status}).`,
      response.status
    );
  }

  return data as AnalysisReport;
}

export async function fetchHistory(
  limit = 20,
  offset = 0,
  signal?: AbortSignal
): Promise<HistoryListResponse> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/history?limit=${limit}&offset=${offset}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("ANALYSIS_TIMEOUT", "La requête a été interrompue.", 0);
    }
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur backend pour récupérer l'historique.",
      0
    );
  }

  if (!response.ok) {
    let errorBody: ApiErrorEnvelope | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // fallback
    }
    if (errorBody?.error?.code) {
      throw new ApiError(
        errorBody.error.code,
        errorBody.error.message || getFallbackErrorMessage(errorBody.error.code),
        response.status,
        errorBody.error.requestId
      );
    }
    throw new ApiError(
      "HISTORY_UNAVAILABLE",
      "L'historique est temporairement indisponible.",
      response.status
    );
  }

  return (await response.json()) as HistoryListResponse;
}

export async function fetchHistoryDetail(
  analysisId: string,
  signal?: AbortSignal
): Promise<AnalysisReport> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/history/${encodeURIComponent(analysisId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("ANALYSIS_TIMEOUT", "La requête a été interrompue.", 0);
    }
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur backend pour charger le rapport d'analyse.",
      0
    );
  }

  if (!response.ok) {
    let errorBody: ApiErrorEnvelope | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // fallback
    }
    if (errorBody?.error?.code) {
      throw new ApiError(
        errorBody.error.code,
        errorBody.error.message || getFallbackErrorMessage(errorBody.error.code),
        response.status,
        errorBody.error.requestId
      );
    }
    throw new ApiError(
      "NOT_FOUND",
      "Le rapport demandé n'a pas été trouvé dans l'historique.",
      response.status
    );
  }

  return (await response.json()) as AnalysisReport;
}

export async function deleteHistoryItem(
  analysisId: string,
  signal?: AbortSignal
): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/history/${encodeURIComponent(analysisId)}`, {
      method: "DELETE",
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("ANALYSIS_TIMEOUT", "La requête a été interrompue.", 0);
    }
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur backend pour supprimer l'analyse.",
      0
    );
  }

  if (response.status === 204) {
    return true;
  }

  let errorBody: ApiErrorEnvelope | null = null;
  try {
    errorBody = (await response.json()) as ApiErrorEnvelope;
  } catch {
    // fallback
  }
  if (errorBody?.error?.code) {
    throw new ApiError(
      errorBody.error.code,
      errorBody.error.message || getFallbackErrorMessage(errorBody.error.code),
      response.status,
      errorBody.error.requestId
    );
  }
  throw new ApiError("INTERNAL_ERROR", "Impossible de supprimer l'analyse.", response.status);
}

export function getFallbackErrorMessage(code: ApiErrorCode): string {
  switch (code) {
    case "INVALID_JSON":
      return "Le format de la requête est incorrect.";
    case "INVALID_URL":
      return "L'adresse saisie n'est pas une URL valide.";
    case "UNSUPPORTED_PROTOCOL":
      return "Seuls les protocoles HTTP et HTTPS sont autorisés.";
    case "BLOCKED_TARGET":
      return "Cette adresse ne peut pas être analysée (protection contre l'accès aux réseaux internes et privés).";
    case "INVALID_PROFILE":
      return "Le profil réseau sélectionné n'est pas pris en charge.";
    case "ANALYSIS_TIMEOUT":
      return "L'analyse a dépassé le délai maximal autorisé.";
    case "NAVIGATION_FAILED":
      return "Le navigateur d'analyse n'a pas pu charger la page demandée.";
    case "ANALYSIS_FAILED":
      return "L'exécution de l'analyse a rencontré une erreur inattendue.";
    case "RATE_LIMITED":
      return "Nombre maximal d'analyses atteint. Veuillez patienter avant de réessayer.";
    case "ANALYSIS_BUSY":
      return "Une analyse est déjà en cours. Veuillez patienter avant de réessayer.";
    case "NOT_FOUND":
      return "Cette ressource API n'existe pas.";
    case "METHOD_NOT_ALLOWED":
      return "Cette méthode n'est pas autorisée pour cette ressource.";
    case "ENGINE_UNAVAILABLE":
      return "Le moteur d'analyse est momentanément indisponible. Réessayez plus tard ou contactez l'équipe LowBand Africa.";
    case "EGRESS_POLICY_UNVERIFIED":
      return "Le service d'analyse n'est pas encore prêt. Aucune installation n'est nécessaire sur votre appareil; réessayez plus tard ou contactez l'équipe LowBand Africa.";
    case "INTERNAL_ERROR":
      return "Une erreur interne est survenue côté serveur.";
    case "HISTORY_UNAVAILABLE":
      return "L'historique est temporairement indisponible.";
    case "INVALID_HISTORY_QUERY":
      return "Les paramètres de consultation de l'historique sont invalides.";
    case "INVALID_ANALYSIS_ID":
      return "L'identifiant d'analyse demandé n'est pas valide.";
    case "NETWORK_ERROR":
      return "Connexion au serveur impossible. Vérifiez l'état de votre réseau.";
    default:
      return "Une erreur inattendue s'est produite lors de l'analyse.";
  }
}
