import React from 'react';
import { X, BookOpen, AlertCircle, Cpu, ShieldCheck, Database } from 'lucide-react';

interface MetricsExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetricsExplainer: React.FC<MetricsExplainerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Forecast Accuracy Metrics &amp; Methodology
              </h2>
              <p className="text-xs text-slate-500">
                UK Wind Energy Trading &amp; Elexon BMRS Ingestion Reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs text-slate-600 leading-relaxed">
          
          {/* Section 1: Error Convention */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <span>1. Forecast Error Convention</span>
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-slate-800">
              Error = Forecast (MW) − Actual (MW)
            </div>
            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600">
              <li>
                <strong className="text-teal-800">Positive Error (+MW):</strong> Overforecasting. The utility expected more wind than was delivered. In trading terms, this induces a short imbalance position in the balancing mechanism.
              </li>
              <li>
                <strong className="text-amber-800">Negative Error (−MW):</strong> Underforecasting. The wind farm produced more than expected, inducing a long imbalance position.
              </li>
            </ul>
          </div>

          {/* Section 2: Mathematical Formulations */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              2. Core Accuracy Metrics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-bold text-slate-900 text-xs mb-1">
                  Mean Absolute Error (MAE)
                </div>
                <div className="font-mono text-[11px] text-slate-700 bg-white px-2 py-1 border rounded mb-1.5">
                  MAE = (1 / N) × Σ |Forecast − Actual|
                </div>
                <p className="text-[11px] text-slate-500">
                  Measures the average magnitude of hourly errors in MW, treating overforecasting and underforecasting equally. Essential for estimating linear volume imbalance costs.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-bold text-slate-900 text-xs mb-1">
                  Root Mean Square Error (RMSE)
                </div>
                <div className="font-mono text-[11px] text-slate-700 bg-white px-2 py-1 border rounded mb-1.5">
                  RMSE = √ [ (1 / N) × Σ (Forecast − Actual)² ]
                </div>
                <p className="text-[11px] text-slate-500">
                  Squares individual errors before averaging, penalizing large ramp errors disproportionately. Critical for transmission system reserve margin planning.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-bold text-slate-900 text-xs mb-1">
                  Mean Bias
                </div>
                <div className="font-mono text-[11px] text-slate-700 bg-white px-2 py-1 border rounded mb-1.5">
                  Mean Bias = (1 / N) × Σ (Forecast − Actual)
                </div>
                <p className="text-[11px] text-slate-500">
                  Indicates whether numerical weather predictions systematically overestimate (positive bias) or underestimate (negative bias) output across the day.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-bold text-slate-900 text-xs mb-1">
                  Data Completeness (%)
                </div>
                <div className="font-mono text-[11px] text-slate-700 bg-white px-2 py-1 border rounded mb-1.5">
                  Completeness = (N_matched / 24) × 100%
                </div>
                <p className="text-[11px] text-slate-500">
                  Ratio of hours with both valid forecast and metered actual records. Missing values are never treated as zero; unmatched hours are excluded from error calculations.
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Safe Missing Data Protocol */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>3. Missing Data &amp; Zero-Substitution Prevention</span>
            </h3>
            <p>
              In energy settlement analysis, treating a missing forecast or unmetered telemetry period as <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">0 MW</code> would artificially corrupt MAE and RMSE with catastrophic 10,000+ MW synthetic errors.
            </p>
            <p className="mt-1.5">
              Our computation engine strictly enforces null-safe matching: if either <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">forecastMW</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">actualMW</code> is null, the record is flagged as unmatched, safely isolated from error statistics, and reported via the Completeness metric.
            </p>
          </div>

          {/* Section 4: Future FastAPI & Elexon BMRS Ingestion */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-600" />
              <span>4. Future Python FastAPI &amp; Elexon BMRS Integration</span>
            </h3>
            <p>
              This prototype frontend communicates with a modular service module (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">src/services/api.ts</code>) returning a typed <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">AnalysisResponse</code>.
            </p>
            <div className="bg-slate-900 text-slate-200 rounded-lg p-3 mt-2 font-mono text-[11px] space-y-1">
              <div className="text-slate-400"># Elexon BMRS API Endpoints to be fetched by FastAPI backend:</div>
              <div><span className="text-teal-400">ACTUALS:</span> https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream</div>
              <div><span className="text-teal-400">FORECAST:</span> https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream</div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              The Python backend will filter WINDFOR records published prior to the purchase decision cutoff (e.g. 12:00 D-1) and correlate with settlement periods in FUELHH.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
