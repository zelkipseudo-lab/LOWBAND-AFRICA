import type { EngineMetrics } from "@lowband/analysis-engine";

export interface Score {
  value: number | null;
  label: "excellent" | "acceptable" | "needs_improvement" | "poor" | "incomplete";
  components: {
    performance: number | null;
    dataEfficiency: number | null;
    resourceOptimization: number | null;
    resilience: number | null;
  };
  availableWeight: number;
  methodologyVersion: "1.0";
}

export interface Recommendation {
  code: string;
  message: string;
  evidence: Record<string, number>;
}

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const budgetScore = (value: number, threshold: number): number =>
  clamp(100 * (1 - value / threshold));

export function calculateScore(metrics: EngineMetrics): Score {
  const performanceTimes = [metrics.navigationMs, metrics.fcpMs, metrics.lcpMs]
    .map((value, index) => ({ value, threshold: [10_000, 5_000, 8_000][index] }))
    .filter((item): item is { value: number; threshold: number } => item.value !== null);
  const performance = performanceTimes.length
    ? performanceTimes.reduce((sum, item) => sum + budgetScore(item.value, item.threshold), 0) /
      performanceTimes.length
    : null;
  const dataEfficiency = metrics.transferBytes === null
    ? null
    : budgetScore(metrics.transferBytes, 2_000_000);
  const resourceOptimization = metrics.transferBytes === null
    ? null
    : 0.7 * budgetScore(metrics.transferBytes, 1_000_000) +
      0.3 * budgetScore(metrics.requestCount, 100);
  const resilience = metrics.requestCount > 0
    ? clamp(100 * (1 - metrics.failedRequests / metrics.requestCount))
    : null;
  const components = { performance, dataEfficiency, resourceOptimization, resilience };
  const weights = { performance: 0.3, dataEfficiency: 0.3, resourceOptimization: 0.2, resilience: 0.2 };
  const availableWeight = Object.entries(components).reduce(
    (sum, [key, value]) => sum + (value === null ? 0 : weights[key as keyof typeof weights]), 0,
  );
  const availableCount = Object.values(components).filter((value) => value !== null).length;
  const value = availableCount < 2 || availableWeight < 0.5
    ? null
    : Math.round(Object.entries(components).reduce(
        (sum, [key, component]) => sum + (component === null ? 0 : component * weights[key as keyof typeof weights]), 0,
      ) / availableWeight);
  const label = value === null ? "incomplete" : value >= 80 ? "excellent" : value >= 60 ? "acceptable" : value >= 40 ? "needs_improvement" : "poor";
  return { value, label, components, availableWeight, methodologyVersion: "1.0" };
}

export function buildRecommendations(metrics: EngineMetrics): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const total = metrics.transferBytes;
  if (total !== null && total > 0 && metrics.resources.imageBytes !== null && metrics.resources.imageBytes / total >= 0.4) {
    recommendations.push({ code: "REVIEW_IMAGES", message: "Les images représentent une part importante des octets transférés.", evidence: { imageShare: metrics.resources.imageBytes / total } });
  }
  if (total !== null && total > 0 && metrics.resources.javascriptBytes !== null && metrics.resources.javascriptBytes / total >= 0.3) {
    recommendations.push({ code: "REVIEW_JAVASCRIPT", message: "JavaScript représente une part importante des octets transférés.", evidence: { javascriptShare: metrics.resources.javascriptBytes / total } });
  }
  if (metrics.requestCount > 60) recommendations.push({ code: "REDUCE_REQUESTS", message: "Le nombre de requêtes observées est élevé.", evidence: { requestCount: metrics.requestCount } });
  if (metrics.requestCount > 0 && metrics.failedRequests / metrics.requestCount > 0.05) {
    recommendations.push({ code: "INVESTIGATE_FAILED_REQUESTS", message: "Une part notable des requêtes a échoué ou retourné une erreur HTTP.", evidence: { failedRequestShare: metrics.failedRequests / metrics.requestCount } });
  }
  return recommendations;
}
