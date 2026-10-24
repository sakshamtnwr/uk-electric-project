/**
 * UK Wind Forecast Accuracy Dashboard.
 * The React frontend requests analysis from the Python FastAPI backend.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { KpiCards } from './components/KpiCards';
import { WindChart } from './components/WindChart';
import { DataTable } from './components/DataTable';
import { MetricsExplainer } from './components/MetricsExplainer';
import { ErrorState, EmptyState, MissingDataBanner } from './components/StatusStates';
import { getAnalysis } from './services/api';
import type { AnalysisResponse } from './types/energy';
import { exportAnalysisToCsv } from './utils/exportCsv';

function followingCalendarDay(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export default function App() {
  // This is the purchase-decision date, not the delivery date.
  const [decisionDate, setDecisionDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('12:00');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAnalysis(decisionDate, cutoffTime);
      setAnalysis(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wind forecast analysis.';
      setErrorMessage(message);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [decisionDate, cutoffTime]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  const handleExportCsv = () => {
    if (analysis && analysis.records.length > 0) {
      exportAnalysisToCsv(analysis);
    }
  };

  const handleResetDate = () => {
    setDecisionDate('2026-01-15');
    setCutoffTime('12:00');
  };

  const displayedDeliveryDate = analysis?.deliveryDate ?? followingCalendarDay(decisionDate);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header
        onOpenExplainer={() => setIsExplainerOpen(true)}
        onExportCsv={analysis && analysis.records.length > 0 ? handleExportCsv : undefined}
      />

      <Controls
        decisionDate={decisionDate}
        onDecisionDateChange={setDecisionDate}
        cutoffTime={cutoffTime}
        onCutoffChange={setCutoffTime}
        isLoading={isLoading}
        onRefresh={() => void loadAnalysis()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errorMessage && !isLoading && (
          <ErrorState message={errorMessage} onRetry={() => void loadAnalysis()} />
        )}

        {!errorMessage && !isLoading && analysis && analysis.records.length === 0 && (
          <EmptyState date={displayedDeliveryDate} onResetDate={handleResetDate} />
        )}

        {!errorMessage && (
          <>
            {analysis && !isLoading && (
              <MissingDataBanner
                missingCount={analysis.metrics.missingRecordsCount}
                totalExpected={analysis.metrics.totalExpectedRecords}
                completeness={analysis.metrics.completeness}
              />
            )}

            <KpiCards metrics={analysis ? analysis.metrics : null} isLoading={isLoading} />

            <WindChart
              records={analysis ? analysis.records : []}
              deliveryDate={displayedDeliveryDate}
              isLoading={isLoading}
            />

            <DataTable
              records={analysis ? analysis.records : []}
              deliveryDate={displayedDeliveryDate}
              onExportCsv={handleExportCsv}
              isLoading={isLoading}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-700">UK Wind Forecast Accuracy Dashboard</span>
            <span className="mx-2">·</span>
            <span>React + Python FastAPI</span>
          </div>
          <div className="text-center md:text-right text-[11px] text-slate-400">
            <span>
              {analysis?.metadata.isDemoData ? 'Demo data' : 'Elexon BMRS data when the API request succeeds'}
              {' · '}Purchase decision date in January 2026
            </span>
            <span className="block mt-0.5">
              Delivery is assumed to be the following calendar day; the 12:00 cutoff is configurable and illustrative.
            </span>
          </div>
        </div>
      </footer>

      <MetricsExplainer
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />
    </div>
  );
}
