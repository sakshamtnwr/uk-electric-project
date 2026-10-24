import React from 'react';
import { Wind, HelpCircle, Download } from 'lucide-react';

interface HeaderProps {
  onOpenExplainer: () => void;
  onExportCsv?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExplainer, onExportCsv }) => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & Title */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center shrink-0 shadow-sm">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  UK Wind Forecast Accuracy Dashboard
                </h1>
                
                {/* Visible DEMO DATA badge */}
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold tracking-wider text-amber-800 bg-amber-50 border border-amber-300 rounded">
                  DEMO DATA
                </span>

                <span className="text-xs text-slate-400 hidden sm:inline">·</span>
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                  GB National Grid Balancing Area
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Benchmarking day-ahead wind generation forecasts against metered actuals from Elexon BMRS for power trading and dispatch accuracy.
              </p>
            </div>
          </div>

          {/* Action Zone */}
          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              onClick={onOpenExplainer}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              title="Learn about forecast accuracy metrics and Elexon BMRS datasets"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Metrics & Methodology</span>
            </button>

            {onExportCsv && (
              <button
                onClick={onExportCsv}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                title="Download displayed 24-hour analysis as CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
