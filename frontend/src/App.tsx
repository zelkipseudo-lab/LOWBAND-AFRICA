import React, { lazy, Suspense, useRef, useState } from "react";
import type { AnalysisReport, NetworkProfileId, ApiErrorCode } from "./types/api";
import { runAnalysis, ApiError } from "./api/client";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { AnalysisForm } from "./components/AnalysisForm";
import { EmptyStatePreview } from "./components/EmptyStatePreview";
import { LoadingState } from "./components/LoadingState";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { ResultsView } from "./components/ResultsView";
import { HistoryView } from "./components/HistoryView";
import { useTheme } from "./theme/useTheme";

const DocumentationModal = lazy(() =>
  import("./components/DocumentationModal").then(({ DocumentationModal }) => ({
    default: DocumentationModal,
  }))
);

type AppViewStatus = "idle" | "loading" | "success" | "error";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"audit" | "history">("audit");
  const [status, setStatus] = useState<AppViewStatus>("idle");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [fromHistory, setFromHistory] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{
    code: ApiErrorCode;
    message: string;
    requestId?: string;
  } | null>(null);

  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentProfile, setCurrentProfile] = useState<NetworkProfileId>("4g");
  const [isDocOpen, setIsDocOpen] = useState<boolean>(false);
  const { theme, toggleTheme } = useTheme();

  const formSectionRef = useRef<HTMLDivElement>(null);

  const handleStartAnalysis = async (url: string, profile: NetworkProfileId) => {
    setActiveTab("audit");
    setFromHistory(false);
    setCurrentUrl(url);
    setCurrentProfile(profile);
    setStatus("loading");
    setErrorInfo(null);
    setReport(null);

    try {
      const data = await runAnalysis({ url, profile });
      setReport(data);
      setStatus("success");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorInfo({
          code: err.code,
          message: err.message,
          requestId: err.requestId,
        });
      } else {
        setErrorInfo({
          code: "UNKNOWN_ERROR",
          message: "Une erreur non identifiée s'est produite lors de la transmission de la requête.",
        });
      }
      setStatus("error");
    }
  };

  const handleReset = () => {
    setActiveTab("audit");
    setStatus("idle");
    setErrorInfo(null);
    setReport(null);
    setFromHistory(false);
  };

  const handleOpenHistory = () => {
    setActiveTab("history");
    setStatus("idle");
    setErrorInfo(null);
    setReport(null);
    setFromHistory(false);
  };

  const handleSelectFromHistory = (selectedReport: AnalysisReport) => {
    setReport(selectedReport);
    setStatus("success");
    setFromHistory(true);
  };

  const handleBackToHistoryList = () => {
    setStatus("idle");
    setReport(null);
    setFromHistory(false);
  };

  const handleScrollToForm = () => {
    formSectionRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleSelectExample = (url: string) => {
    setCurrentUrl(url);
    handleScrollToForm();
  };

  return (
    <div
      data-theme={theme}
      className="app-shell min-h-screen flex flex-col bg-canvas text-foreground font-sans selection:bg-accent selection:text-ink"
    >
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>
      <Header
        onReset={handleReset}
        onOpenHistory={handleOpenHistory}
        activeView={activeTab}
        onOpenDoc={() => setIsDocOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main
        id="main-content"
        className="page-main flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10"
      >
        {activeTab === "history" ? (
          status === "success" && report ? (
            <ResultsView
              report={report}
              onReset={handleReset}
              onBack={handleBackToHistoryList}
            />
          ) : (
            <HistoryView
              onSelectReport={handleSelectFromHistory}
              onNewAudit={handleReset}
            />
          )
        ) : (
          <>
            {status === "idle" && (
              <div className="space-y-8 sm:space-y-10">
                <HeroSection onScrollToForm={handleScrollToForm} />

                <div ref={formSectionRef} className="space-y-3">
                  <div className="form-section-heading">
                    <div>
                      <span className="section-kicker">CONFIGURATION DU BENCHMARK · 01</span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                        Choisissez le profil réseau. Lancez l'audit.
                      </h2>
                    </div>
                    <span className="section-status">
                      <span aria-hidden="true" /> 4 profils de laboratoire
                    </span>
                  </div>
                  <AnalysisForm
                    onSubmit={handleStartAnalysis}
                    isLoading={false}
                    initialUrl={currentUrl}
                    initialProfile={currentProfile}
                  />
                </div>

                <EmptyStatePreview onSelectExample={handleSelectExample} />
              </div>
            )}

            {status === "loading" && (
              <LoadingState url={currentUrl} profile={currentProfile} />
            )}

            {status === "error" && errorInfo && (
              <ErrorDisplay
                code={errorInfo.code}
                message={errorInfo.message}
                requestId={errorInfo.requestId}
                onRetry={handleReset}
              />
            )}

            {status === "success" && report && (
              <ResultsView
                report={report}
                onReset={handleReset}
                onBack={fromHistory ? handleBackToHistoryList : undefined}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      <Suspense fallback={null}>
        <DocumentationModal
          isOpen={isDocOpen}
          onClose={() => setIsDocOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default App;
