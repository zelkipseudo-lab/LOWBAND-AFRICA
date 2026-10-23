import { jsPDF } from "jspdf";
import type { AnalysisReport } from "../types/api";
import { PROFILE_LABELS } from "../constants/profiles";
import { formatBytes, formatDuration } from "./format";

// Semantic color palette in RGB tuples (avoids hardcoded hex tokens)
const COLOR_NAVY: [number, number, number] = [16, 42, 67];
const COLOR_TURQUOISE: [number, number, number] = [46, 196, 182];
const COLOR_WHITE: [number, number, number] = [255, 255, 255];
const COLOR_MUTED: [number, number, number] = [100, 116, 139];
const COLOR_SURFACE: [number, number, number] = [245, 247, 250];
const COLOR_BORDER: [number, number, number] = [220, 226, 235];
const COLOR_DARK: [number, number, number] = [30, 41, 59];

const SCORE_LABELS_FR: Record<string, string> = {
  excellent: "Excellent",
  acceptable: "Acceptable",
  needs_improvement: "A ameliorer",
  poor: "Faible",
  incomplete: "Donnees incompletes",
};

export function generateAnalysisPdf(report: AnalysisReport): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      renderPageHeader();
    }
  };

  const renderPageHeader = () => {
    doc.setFillColor(...COLOR_SURFACE);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("LOWBAND AFRICA - RAPPORT TECHNIQUE D'AUDIT DE CONNECTIVITE", margin + 3, y + 5.5);
    doc.text(`ID: ${report.analysisId.slice(0, 16)}...`, pageWidth - margin - 3, y + 5.5, {
      align: "right",
    });
    y += 12;
  };

  // 1. Top Header Banner
  doc.setFillColor(...COLOR_NAVY);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");

  // Tag
  doc.setFillColor(...COLOR_TURQUOISE);
  doc.roundedRect(margin + 6, y + 5, 42, 5.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("RAPPORT OFFICIEL", margin + 8, y + 9);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_WHITE);
  doc.text("LowBand Africa", margin + 6, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text("Observatoire de connectivite et d'accessibilite web en reseau contraint", margin + 6, y + 23);

  // Status & Date on the right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 215, 230);
  const formattedDate = new Date(report.startedAt).toLocaleString("fr-FR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  doc.text(`Date: ${formattedDate} UTC`, pageWidth - margin - 6, y + 12, { align: "right" });
  doc.text(`Profil: ${PROFILE_LABELS[report.profile] || report.profile}`, pageWidth - margin - 6, y + 17, {
    align: "right",
  });
  doc.text(
    `Statut: ${report.status === "completed" ? "Session complete" : "Session partielle"}`,
    pageWidth - margin - 6,
    y + 22,
    { align: "right" }
  );

  y += 40;

  // 2. Target URL Card
  doc.setFillColor(...COLOR_SURFACE);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("URL CIBLE AUDITEE", margin + 4, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_DARK);
  const truncatedUrl = report.url.length > 70 ? `${report.url.slice(0, 67)}...` : report.url;
  doc.text(truncatedUrl, margin + 4, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Duree de session: ${formatDuration(report.durationMs)}`, pageWidth - margin - 4, y + 12, {
    align: "right",
  });

  y += 24;

  // 3. Africa Ready Score Section
  ensureSpace(45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("1. AFRICA READY SCORE (v1.0)", margin, y);
  y += 5;

  // Score Container Box
  doc.setFillColor(...COLOR_SURFACE);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, "FD");

  // Left circle / badge for global score
  const scoreValue = report.score.value !== null ? report.score.value : "-";
  const scoreLabel = SCORE_LABELS_FR[report.score.label] || report.score.label;

  doc.setFillColor(...COLOR_NAVY);
  doc.roundedRect(margin + 5, y + 5, 34, 28, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_TURQUOISE);
  doc.text(`${scoreValue}`, margin + 22, y + 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text("/ 100", margin + 22, y + 24, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(scoreLabel, margin + 22, y + 29, { align: "center" });

  // Right sub-scores grid (4 components)
  const components = [
    {
      name: "Performance (30 %)",
      val: report.score.components.performance,
      note: "Navigation < 10s, FCP < 5s",
    },
    {
      name: "Efficacite des donnees (30 %)",
      val: report.score.components.dataEfficiency,
      note: "Budget cible 2 Mo",
    },
    {
      name: "Optimisation des ressources (20 %)",
      val: report.score.components.resourceOptimization,
      note: "Budget 1 Mo, req <= 100",
    },
    {
      name: "Resilience observee (20 %)",
      val: report.score.components.resilience,
      note: "Taux d'echec < 5 %",
    },
  ];

  const colWidth = (contentWidth - 48) / 2;
  components.forEach((comp, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cx = margin + 44 + col * (colWidth + 4);
    const cy = y + 6 + row * 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_DARK);
    doc.text(comp.name, cx, cy);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    const compValStr = comp.val !== null ? `${Math.round(comp.val)} / 100` : "Indisponible";
    doc.text(compValStr, cx + colWidth - 2, cy, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(comp.note, cx, cy + 4.5);
  });

  y += 44;

  // 4. Performance Metrics Table
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("2. METRIQUES D'EXECUTION REELLES (CHROMIUM CDP)", margin, y);
  y += 5;

  const metricsTable = [
    [
      "Duree de navigation (load)",
      formatDuration(report.metrics.navigationMs),
      "Seuil cible < 10 s",
      "Temps total jusqu'a l'evenement DOM load",
    ],
    [
      "First Contentful Paint (FCP)",
      formatDuration(report.metrics.fcpMs),
      "Seuil cible < 5 s",
      "Premier affichage visuel perceptible",
    ],
    [
      "Largest Contentful Paint (LCP)",
      formatDuration(report.metrics.lcpMs),
      "Fenetre de capture 2 s",
      "Rendu du bloc de contenu principal",
    ],
    [
      "Volume de donnees transferees",
      formatBytes(report.metrics.transferBytes),
      "Budget cible < 2 Mo",
      "Poids brut des reponses compressees",
    ],
    [
      "Nombre de requetes reseau",
      report.metrics.requestCount.toString(),
      "Seuil cible <= 60",
      "Allers-retours client-serveur observes",
    ],
    [
      "Requetes en echec / rejetees",
      `${report.metrics.failedRequests} (${report.metrics.requestCount > 0 ? Math.round((report.metrics.failedRequests / report.metrics.requestCount) * 100) : 0} %)`,
      "Zero echec tolere",
      "Erreurs reseau ou codes HTTP 4xx/5xx",
    ],
  ];

  // Table header
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text("INDICATEUR", margin + 3, y + 4.8);
  doc.text("VALEUR MESUREE", margin + 65, y + 4.8);
  doc.text("REFERENCE", margin + 105, y + 4.8);
  doc.text("DESCRIPTION", margin + 140, y + 4.8);
  y += 7;

  // Table rows
  metricsTable.forEach((row, rIndex) => {
    const isEven = rIndex % 2 === 0;
    doc.setFillColor(isEven ? 255 : COLOR_SURFACE[0], isEven ? 255 : COLOR_SURFACE[1], isEven ? 255 : COLOR_SURFACE[2]);
    doc.rect(margin, y, contentWidth, 6.5, "F");
    doc.setDrawColor(...COLOR_BORDER);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(row[0], margin + 3, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_NAVY);
    doc.text(row[1], margin + 65, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(row[2], margin + 105, y + 4.5);
    doc.text(row[3], margin + 140, y + 4.5);

    y += 6.5;
  });

  y += 7;

  // 5. Resource Breakdown Table
  ensureSpace(42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("3. REPARTITION DES RESSOURCES PAR TYPE", margin, y);
  y += 5;

  const totalTransfer = report.metrics.transferBytes || 0;
  const resources = [
    { label: "JavaScript (Scripts)", bytes: report.metrics.resources.javascriptBytes },
    { label: "Feuilles de style (CSS)", bytes: report.metrics.resources.cssBytes },
    { label: "Images", bytes: report.metrics.resources.imageBytes },
    { label: "Polices web (Fonts)", bytes: report.metrics.resources.fontBytes },
    { label: "Autres ressources", bytes: report.metrics.resources.otherBytes },
  ];

  doc.setFillColor(...COLOR_NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text("CATEGORIE DE RESSOURCE", margin + 3, y + 4.8);
  doc.text("VOLUME TRANSFERE", margin + 90, y + 4.8);
  doc.text("PART DU TOTAL OBSERVE", margin + 140, y + 4.8);
  y += 7;

  resources.forEach((res, rIndex) => {
    const isEven = rIndex % 2 === 0;
    doc.setFillColor(isEven ? 255 : COLOR_SURFACE[0], isEven ? 255 : COLOR_SURFACE[1], isEven ? 255 : COLOR_SURFACE[2]);
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setDrawColor(...COLOR_BORDER);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    const b = res.bytes ?? null;
    const pct = totalTransfer > 0 && b !== null ? `${Math.round((b / totalTransfer) * 100)} %` : "-";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(res.label, margin + 3, y + 4.2);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_NAVY);
    doc.text(formatBytes(b), margin + 90, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOR_MUTED);
    doc.text(pct, margin + 140, y + 4.2);

    y += 6;
  });

  y += 7;

  // 6. Recommendations Section
  ensureSpace(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text(`4. RECOMMANDATIONS D'OPTIMISATION (${report.recommendations.length})`, margin, y);
  y += 5;

  if (report.recommendations.length === 0) {
    doc.setFillColor(...COLOR_SURFACE);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("Aucune anomalie majeure detectee. La page respecte les seuils recommandes.", margin + 4, y + 6.5);
    y += 14;
  } else {
    report.recommendations.forEach((rec) => {
      ensureSpace(16);
      doc.setFillColor(...COLOR_SURFACE);
      doc.setDrawColor(...COLOR_BORDER);
      doc.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, "FD");

      doc.setFillColor(...COLOR_NAVY);
      doc.roundedRect(margin + 3, y + 3, 30, 4.5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...COLOR_TURQUOISE);
      doc.text(rec.code, margin + 5, y + 6.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_DARK);
      const splitMsg = doc.splitTextToSize(rec.message, contentWidth - 40);
      doc.text(splitMsg, margin + 36, y + 6.5);

      y += 15;
    });
  }

  // 7. Warnings (if any)
  if (report.warnings.length > 0) {
    ensureSpace(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`5. LIMITES & AVERTISSEMENTS D'OBSERVATION (${report.warnings.length})`, margin, y);
    y += 5;

    report.warnings.forEach((warn) => {
      ensureSpace(12);
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      const splitWarn = doc.splitTextToSize(warn, contentWidth - 8);
      doc.text(splitWarn, margin + 4, y + 5.5);

      y += 11;
    });
  }

  // 8. Bottom Footer
  ensureSpace(16);
  y = Math.max(y + 4, pageHeight - margin - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    "LowBand Africa v1.0 - Benchmark independant d'accessibilite web. Mesures reelles de laboratoire via Chromium DevTools Protocol.",
    margin,
    y
  );
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, y, { align: "right" });

  // Generate clean filename
  const cleanDate = formattedDate.split(" ")[0].replace(/\//g, "-");
  let hostSlug = "site";
  try {
    hostSlug = new URL(report.url).hostname.replace(/[^a-z0-9]/gi, "-");
  } catch {
    // fallback
  }
  const filename = `lowband-africa-rapport-${cleanDate}-${hostSlug}.pdf`;

  doc.save(filename);
}
