import React from "react";
import {
  X,
  BookOpen,
  Layers,
  CheckCircle2,
  Gauge,
  Cpu,
  ShieldCheck,
} from "lucide-react";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-outline/30 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-outline/20 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-outline/30 bg-surface-raised flex items-center justify-center text-accent shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="doc-modal-title" className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                Méthodologie & Guide d'Utilisation LowBand Africa
              </h2>
              <p className="text-xs font-mono text-muted">
                Guide pédagogique · Comprendre le benchmark et optimiser vos services web
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer shrink-0"
            aria-label="Fermer la documentation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-8 text-xs sm:text-sm text-foreground/85 leading-relaxed font-sans">
          {/* Section 1: 5-step journey */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-accent shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider">
                1. Le parcours d'audit en 5 étapes simples
              </h3>
            </div>
            <p className="text-xs text-muted">
              LowBand Africa a été conçu pour être immédiatement compréhensible par toute personne — qu'elle soit
              développeur, chef de projet ou décideur public — sans nécessiter de compétences techniques pointues.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Étape 01
                  </span>
                  <h4 className="text-xs font-bold text-foreground">Entrez une URL</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Saisissez l'adresse de votre site. Le protocole HTTPS est complété automatiquement si omis.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Étape 02
                  </span>
                  <h4 className="text-xs font-bold text-foreground">Choisissez un profil</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Sélectionnez le niveau de réseau représentatif de votre public cible (de Haut débit à 3G lente).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Étape 03
                  </span>
                  <h4 className="text-xs font-bold text-foreground">Lancez l'analyse</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Un navigateur Chromium sécurisé charge la page sous les contraintes physiques exactes du profil.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Étape 04
                  </span>
                  <h4 className="text-xs font-bold text-foreground">Lisez les résultats</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Consultez l'Africa Ready Score, le volume de données consommé et les pistes d'amélioration.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Étape 05
                  </span>
                  <h4 className="text-xs font-bold text-foreground">Comparez & Exportez</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Téléchargez le rapport officiel en PDF et comparez avec d'autres profils via l'historique.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Network Profiles */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 text-foreground">
              <Gauge className="w-4 h-4 text-accent shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider">
                2. Comprendre les 4 profils réseau disponibles
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-accent/30 bg-accent/5 text-xs text-foreground/90 space-y-1">
              <div className="flex items-center gap-2 font-bold text-accent">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Principe de transparence méthodologique</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                Ces profils correspondent à des conditions de test de laboratoire standardisées définies par LowBand Africa
                pour simuler des scénarios d'usage représentatifs et reproductibles. Ils ne prétendent pas constituer une norme
                universelle ou une moyenne officielle de l'ensemble des réseaux réels de chaque pays.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Profile 1 */}
              <div className="p-4 rounded-xl border border-outline/30 bg-surface-raised/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-outline/20 pb-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-foreground uppercase">Haut débit (Fast)</h4>
                    <span className="text-[11px] font-mono text-accent">20 Mbps · 20 ms RTT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-outline/30 text-muted">
                    Référence
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    <strong className="text-foreground">Ce qu'il simule :</strong> Une connexion fibre ou 4G+ optimale avec serveurs proches.
                  </p>
                  <p>
                    <strong className="text-foreground">Scénario de test :</strong> Utilisateur urbain connecté au Wi-Fi rapide ou forfait data illimité.
                  </p>
                  <p>
                    <strong className="text-foreground">Comportement observé :</strong> Les fichiers se téléchargent vite. Met en évidence les ralentissements causés par l'exécution JavaScript du téléphone.
                  </p>
                  <p className="text-muted italic">
                    <strong>Interprétation :</strong> Sert d'étalon de base : si le site est lent ici, le problème vient du code et non de la ligne réseau.
                  </p>
                </div>
              </div>

              {/* Profile 2 */}
              <div className="p-4 rounded-xl border border-outline/30 bg-surface-raised/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-outline/20 pb-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-foreground uppercase">4G Mobile Standard</h4>
                    <span className="text-[11px] font-mono text-accent">10 Mbps · 50 ms RTT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-outline/30 text-muted">
                    Standard mobile
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    <strong className="text-foreground">Ce qu'il simule :</strong> Une bonne connexion mobile 4G en zone urbaine ou périurbaine couverte.
                  </p>
                  <p>
                    <strong className="text-foreground">Scénario de test :</strong> Navigation sur smartphone moderne avec forfait data standard.
                  </p>
                  <p>
                    <strong className="text-foreground">Comportement observé :</strong> Les images lourdes et les scripts tiers commencent à décaler l'affichage visuel perceptible.
                  </p>
                  <p className="text-muted italic">
                    <strong>Interprétation :</strong> Le score minimal acceptable pour un usage commercial moderne. Si votre note chute ici, de nombreux visiteurs décrochent.
                  </p>
                </div>
              </div>

              {/* Profile 3 */}
              <div className="p-4 rounded-xl border border-outline/30 bg-surface-raised/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-outline/20 pb-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-foreground uppercase">3G Mobile Intermédiaire</h4>
                    <span className="text-[11px] font-mono text-accent">1,5 Mbps · 150 ms RTT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-outline/30 text-muted">
                    Cœur de cible
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    <strong className="text-foreground">Ce qu'il simule :</strong> Une 3G standard ou une 4G congestionnée avec serveur international distant.
                  </p>
                  <p>
                    <strong className="text-foreground">Scénario de test :</strong> Usager avec forfait mobile prépayé (recharge par Mo), signal moyen, heures de forte affluence.
                  </p>
                  <p>
                    <strong className="text-foreground">Comportement observé :</strong> Chaque requête réseau prend du temps (délai d'aller-retour). Les sites de plus de 2 Mo coûtent cher et rament.
                  </p>
                  <p className="text-muted italic">
                    <strong>Interprétation :</strong> Le profil d'inclusion numérique par excellence : un bon score garantit que votre service est accessible au plus grand nombre.
                  </p>
                </div>
              </div>

              {/* Profile 4 */}
              <div className="p-4 rounded-xl border border-outline/30 bg-surface-raised/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-outline/20 pb-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-foreground uppercase">3G Lente / Edge Dégradé</h4>
                    <span className="text-[11px] font-mono text-accent">400 Kbps · 400 ms RTT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-outline/30 text-muted">
                    Résilience critique
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    <strong className="text-foreground">Ce qu'il simule :</strong> Une couverture cellulaire affaiblie ou liaison satellite avec très forte latence.
                  </p>
                  <p>
                    <strong className="text-foreground">Scénario de test :</strong> Déplacements en zone rurale, périphéries éloignées, urgences humanitaires ou réseau saturé.
                  </p>
                  <p>
                    <strong className="text-foreground">Comportement observé :</strong> Seules les pages ultra-légères (HTML sobre, peu de scripts) réussissent à afficher leur contenu utile.
                  </p>
                  <p className="text-muted italic">
                    <strong>Interprétation :</strong> Teste la résilience vitale : indispensable pour les sites d'information publique, santé et éducation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Scoring formula */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Cpu className="w-4 h-4 text-accent shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider">
                3. Calcul transparent de l'Africa Ready Score
              </h3>
            </div>
            <p className="text-xs text-muted">
              Le score global est un nombre entier sur 100 fondé sur des métriques réelles mesurées lors du chargement.
              Aucune estimation artificielle n'est inventée pour les données non observées.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-xs text-foreground font-mono">Performance de chargement</strong>
                  <span className="text-[11px] font-bold text-accent font-mono">30 %</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Mesure la rapidité perçue : temps jusqu'au chargement complet (seuil cible &lt; 10 s), First Contentful Paint (FCP &lt; 5 s) et Largest Contentful Paint (LCP &lt; 8 s).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-xs text-foreground font-mono">Efficacité des données</strong>
                  <span className="text-[11px] font-bold text-accent font-mono">30 %</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Mesure le volume total d'octets transférés par rapport au budget cible de 2 Mo. Plus la page est légère, moins elle coûte cher à l'internaute.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-xs text-foreground font-mono">Optimisation des ressources</strong>
                  <span className="text-[11px] font-bold text-accent font-mono">20 %</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Combine un budget de transfert strict (1 Mo) et la limitation du nombre de requêtes HTTP (&lt;= 100 requêtes pour éviter la pénalité de latence RTT).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-xs text-foreground font-mono">Résilience observée</strong>
                  <span className="text-[11px] font-bold text-accent font-mono">20 %</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Pourcentage de requêtes réseau réussies sans code d'erreur HTTP 4xx ou 5xx. Les liens cassés ou scripts tiers défaillants pénalisent ce score.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: What to do with results */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider">
                4. Que faire de vos résultats ?
              </h3>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p>
                Lorsque l'audit se termine, vous pouvez :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 font-medium text-[11px]">
                <li>
                  <strong>Télécharger le rapport PDF :</strong> Cliquez sur le bouton officiel pour générer un document technique partageable avec vos équipes et clients.
                </li>
                <li>
                  <strong>Appliquer les recommandations :</strong> Réduisez le poids des images (format WebP/AVIF), allégez le JavaScript et limitez les polices web tierces.
                </li>
                <li>
                  <strong>Consulter l'historique :</strong> Retrouvez toutes vos analyses passées et comparez l'évolution des scores avant et après vos optimisations.
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-outline/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-muted text-center sm:text-left">
            LowBand Africa · Benchmark d'accessibilité numérique et résilience web
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all cursor-pointer shadow-sm"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
