import React from 'react';
import { AlertTriangle, RefreshCw, Database, Info } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-white border border-rose-200 rounded-lg p-8 text-center max-w-xl mx-auto my-8 shadow-xs">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900">Analysis Request Error</h3>
      <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5 my-3 font-mono break-words">
        {message}
      </p>
      <p className="text-xs text-slate-500 mb-4">
        Check that the FastAPI backend is running and that the selected date and cutoff are valid, then try again.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry Analysis Request</span>
      </button>
    </div>
  );
};

interface EmptyStateProps {
  date: string;
  onResetDate: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ date, onResetDate }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
        <Database className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900">No Data Available for Delivery Date {date}</h3>
      <p className="text-xs text-slate-500 my-3">
        No usable forecast/actual matches were returned for this delivery day. The selected purchase-decision date is in January 2026, and delivery is assumed to be the following calendar day.
      </p>
      <button
        onClick={onResetDate}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors"
      >
        <span>Reset to 15 January decision date</span>
      </button>
    </div>
  );
};

interface MissingDataBannerProps {
  missingCount: number;
  totalExpected: number;
  completeness: number;
}

export const MissingDataBanner: React.FC<MissingDataBannerProps> = ({
  missingCount,
  totalExpected,
  completeness,
}) => {
  if (missingCount <= 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-3">
      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="font-bold">Missing Data Intervals Detected: </span>
        <span>
          {missingCount} of {totalExpected} delivery hours ({completeness.toFixed(1)}% completeness) are missing either actual generation or forecast records.
        </span>
        <span className="block mt-0.5 text-amber-800 text-[11px]">
          Missing intervals are excluded from MAE and RMSE calculations rather than treated as zero generation.
        </span>
      </div>
    </div>
  );
};
