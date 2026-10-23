import React from "react";
import { Activity, ArrowRight, Cpu, Database, Gauge, ShieldCheck } from "lucide-react";

interface EmptyStatePreviewProps {
  onSelectExample: (url: string) => void;
}

const pillars = [
  {
    number: "01",
    icon: Gauge,
    title: "Vitesse perçue",
    weight: "30 % du score",
    description: "Durée de navigation complète et métriques de premier affichage visuel (FCP et LCP).",
    benchmark: "Navigation < 10 s · FCP < 5 s",
  },
  {
    number: "02",
    icon: Database,
    title: "Données transférées",
    weight: "30 % du score",
    description: "Volume réel d'octets transférés, comparé au budget cible d'accessibilité économique.",
    benchmark: "Budget de référence : 2 Mo",
  },
  {
    number: "03",
    icon: Cpu,
    title: "Ressources chargées",
    weight: "20 % du score",
    description: "Poids cumulé des ressources statiques et nombre d'allers-retours réseau (RTT) observés.",
    benchmark: "Budget : 1 Mo · Seuil : 100 requêtes",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Résilience observée",
    weight: "20 % du score",
    description: "Proportion de requêtes réseau achevées avec succès sans code d'erreur HTTP 4xx/5xx.",
    benchmark: "Tolérance cible : < 5 % d'échecs",
  },
];

export const EmptyStatePreview: React.FC<EmptyStatePreviewProps> = ({ onSelectExample }) => (
  <section className="evaluation-section" aria-labelledby="evaluation-title">
    <div className="evaluation-heading">
      <div>
        <div className="evaluation-kicker">
          <Activity size={14} aria-hidden="true" />
          <span>Cadre méthodologique · Version 1.0</span>
        </div>
        <h2 id="evaluation-title">Comprendre l'Africa Ready Score</h2>
      </div>
      <p>
        Quatre dimensions complémentaires mesurées lors d'une session Chromium réelle.
        Les métriques non observables ne reçoivent aucune note artificielle.
      </p>
    </div>

    <div className="evaluation-grid">
      {pillars.map(({ number, icon: Icon, title, weight, description, benchmark }) => (
        <article className="evaluation-card" key={number}>
          <div>
            <div className="evaluation-card-top">
              <span className="evaluation-number">{number}</span>
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
            </div>
            <span className="evaluation-weight">{weight}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <div className="evaluation-benchmark">{benchmark}</div>
        </article>
      ))}
    </div>

    <div className="evaluation-cta">
      <div>
        <span className="evaluation-cta-index">DÉMONSTRATION RAPIDE</span>
        <p>Chargez un site de référence pour explorer les métriques d'audit.</p>
      </div>
      <div className="evaluation-examples">
        <button onClick={() => onSelectExample("https://example.com")}>
          <span>example.com</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button onClick={() => onSelectExample("https://www.wikipedia.org")}>
          <span>wikipedia.org</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
);
