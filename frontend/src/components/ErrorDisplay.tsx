import React from "react";
import {
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Clock,
  Radio,
  ServerCrash,
  WifiOff,
} from "lucide-react";
import type { ApiErrorCode } from "../types/api";

interface ErrorDisplayProps {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  code,
  message,
  requestId,
  onRetry,
}) => {
  const getErrorMeta = () => {
    switch (code) {
      case "BLOCKED_TARGET":
        return {
          title: "Destination non autorisée (SSRF)",
          icon: ShieldAlert,
          context:
            "La politique de sécurité du serveur bloque l'accès aux adresses locales (localhost, 127.0.0.1), privées (RFC 1918), de bouclage et aux services de métadonnées cloud pour protéger l'infrastructure.",
          advice: "Vérifiez que le nom de domaine correspond bien à un site public accessible sur l'internet ouvert.",
        };
      case "ENGINE_UNAVAILABLE":
        return {
          title: "Moteur d'analyse indisponible",
          icon: ServerCrash,
          context:
            "Le service n'a pas pu démarrer son navigateur d'analyse sur le serveur.",
          advice:
            "Aucun navigateur ni logiciel n'est à installer sur votre appareil. Réessayez plus tard ou contactez l'équipe LowBand Africa.",
        };
      case "EGRESS_POLICY_UNVERIFIED":
        return {
          title: "Service d'analyse temporairement indisponible",
          icon: ServerCrash,
          context:
            "Le service d'analyse n'est pas configuré pour exécuter Chromium avec les protections réseau requises.",
          advice:
            "Aucune installation n'est nécessaire sur votre appareil. Réessayez plus tard ou contactez l'équipe LowBand Africa.",
        };
      case "ANALYSIS_TIMEOUT":
        return {
          title: "Délai de garde maximal dépassé",
          icon: Clock,
          context:
            "Le site a mis plus de temps à répondre que le délai maximal accordé sous ce profil réseau contraint (délai de garde de 30 à 40 secondes).",
          advice:
            "Essayez d'analyser le site avec un profil réseau plus rapide (ex. 4G au lieu de 3G lente) ou vérifiez la disponibilité du serveur cible.",
        };
      case "RATE_LIMITED":
        return {
          title: "Limite de requêtes atteinte",
          icon: Radio,
          context:
            "Le backend limite le nombre d'analyses à une tâche simultanée et à 10 analyses par tranche de 10 minutes par adresse cliente.",
          advice: "Veuillez patienter quelques instants avant de relancer une nouvelle demande.",
        };
      case "ANALYSIS_BUSY":
        return {
          title: "Analyse déjà en cours d'exécution",
          icon: Radio,
          context:
            "Une analyse est déjà en cours sur cette instance locale de LowBand Africa. Le moteur traite une requête à la fois pour garantir la fidélité des mesures.",
          advice: "Patientez quelques secondes jusqu'à la fin de la tâche en cours puis réessayez.",
        };
      case "NAVIGATION_FAILED":
        return {
          title: "Échec de navigation réseau",
          icon: AlertTriangle,
          context:
            "Le navigateur Chromium n'a pas pu établir la connexion avec le serveur distant (erreur de résolution DNS, certificat SSL non reconnu ou refus de connexion).",
          advice: "Assurez-vous que l'URL est active et accessible dans un navigateur standard sans VPN.",
        };
      case "NETWORK_ERROR":
        return {
          title: "Serveur API non joignable",
          icon: WifiOff,
          context:
            "Le frontend n'a pas pu contacter l'API LowBand Africa (http://127.0.0.1:3001).",
          advice:
            "Vérifiez que le service backend est bien lancé (via 'npm run dev' dans le dossier backend).",
        };
      default:
        return {
          title: "Anomalie d'exécution de la requête",
          icon: AlertTriangle,
          context: message || "Une erreur est survenue lors de l'exécution de l'analyse.",
          advice: "Vérifiez les paramètres de saisie et réessayez.",
        };
    }
  };

  const meta = getErrorMeta();
  const IconComponent = meta.icon;

  return (
    <div className="bg-surface border border-danger/45 rounded-2xl p-6 sm:p-10 shadow-soft space-y-6" role="alert">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl border border-danger/35 bg-danger/10 text-danger flex items-center justify-center shrink-0 shadow-sm">
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="inline-block px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded-md border border-outline/30 bg-surface-raised text-foreground">
            Code d'erreur : {code}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{meta.title}</h2>
          <p className="text-xs sm:text-sm text-muted font-medium">{message}</p>
        </div>
      </div>

      <div className="bg-surface-raised/40 border border-outline/30 rounded-xl p-5 space-y-3.5 text-xs text-foreground/80">
        <div>
          <span className="font-bold text-foreground block font-mono uppercase text-[11px] mb-1">
            Explication technique :
          </span>
          <p className="leading-relaxed">{meta.context}</p>
        </div>
        <div>
          <span className="font-bold text-foreground block font-mono uppercase text-[11px] mb-1">
            Action recommandée :
          </span>
          <p className="leading-relaxed">{meta.advice}</p>
        </div>
        {requestId && (
          <div className="pt-2 border-t border-outline/20 font-mono text-[11px] text-muted">
            Identifiant d'incident technique (requestId) : {requestId}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-180 bg-accent text-ink hover:bg-accent-strong flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Modifier l'adresse ou le profil</span>
        </button>
      </div>
    </div>
  );
};
