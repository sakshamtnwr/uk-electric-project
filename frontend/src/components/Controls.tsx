import React from 'react';
import { Calendar, Clock, RefreshCw } from 'lucide-react';

interface ControlsProps {
  decisionDate: string;
  onDecisionDateChange: (newDate: string) => void;
  cutoffTime: string;
  onCutoffChange: (newCutoff: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  decisionDate,
  onDecisionDateChange,
  cutoffTime,
  onCutoffChange,
  isLoading,
  onRefresh,
}) => {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end w-full lg:max-w-3xl">
            <div>
              <label
                htmlFor="decision-date-input"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Purchase Decision Date (Jan 2026)</span>
              </label>
              <input
                id="decision-date-input"
                type="date"
                min="2026-01-01"
                max="2026-01-31"
                value={decisionDate}
                onChange={(event) => onDecisionDateChange(event.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                <span>Quick:</span>
                {[
                  { value: '2026-01-08', label: 'Jan 8' },
                  { value: '2026-01-15', label: 'Jan 15' },
                  { value: '2026-01-26', label: 'Jan 26' },
                ].map((option, index) => (
                  <React.Fragment key={option.value}>
                    {index > 0 && <span>·</span>}
                    <button
                      type="button"
                      onClick={() => onDecisionDateChange(option.value)}
                      className={`hover:text-teal-700 underline underline-offset-2 ${decisionDate === option.value ? 'font-bold text-teal-800' : ''}`}
                    >
                      {option.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Delivery date is assumed to be the following calendar day.
              </p>
            </div>

            <div>
              <label
                htmlFor="cutoff-time-input"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Forecast Publication Cutoff (UK time)</span>
              </label>
              <input
                id="cutoff-time-input"
                type="time"
                step="60"
                value={cutoffTime}
                onChange={(event) => onCutoffChange(event.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                12:00 is an illustrative default, not a confirmed client requirement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading || !decisionDate || !cutoffTime}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Fetching data...' : 'Refresh Analysis'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
