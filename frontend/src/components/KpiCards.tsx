import React from 'react';
import { ForecastMetrics } from '../types/energy';
import { formatMW, formatSignedMW } from '../utils/metrics';
import { TrendingUp, TrendingDown, Target, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

interface KpiCardsProps {
  metrics: ForecastMetrics | null;
  isLoading?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded mb-3"></div>
            <div className="h-7 w-32 bg-slate-200 rounded mb-2"></div>
            <div className="h-2.5 w-40 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    mae,
    rmse,
    meanBias,
    completeness,
    matchedRecordsCount,
    totalExpectedRecords,
    missingRecordsCount,
  } = metrics;

  // Determine Bias description and color tone
  const isOverforecast = meanBias !== null && meanBias > 0;
  const isUnderforecast = meanBias !== null && meanBias < 0;

  return (
    <div className="space-y-3">
      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. MAE (Mean Absolute Error) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Mean Absolute Error (MAE)
            </span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {mae !== null ? mae.toLocaleString('en-GB') : '—'}
            </span>
            <span className="text-sm font-semibold text-slate-500">MW</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Average magnitude of hourly imbalance</span>
          </div>
        </div>

        {/* 2. RMSE (Root Mean Square Error) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Root Mean Square Error (RMSE)
            </span>
            <Zap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {rmse !== null ? rmse.toLocaleString('en-GB') : '—'}
            </span>
            <span className="text-sm font-semibold text-slate-500">MW</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Higher penalty for large ramp deviations</span>
          </div>
        </div>

        {/* 3. Mean Bias */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Mean Bias (Forecast − Actual)
            </span>
            {isOverforecast ? (
              <TrendingUp className="w-4 h-4 text-teal-600" />
            ) : isUnderforecast ? (
              <TrendingDown className="w-4 h-4 text-amber-600" />
            ) : (
              <Target className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${
              isOverforecast ? 'text-teal-700' : isUnderforecast ? 'text-amber-700' : 'text-slate-900'
            }`}>
              {formatSignedMW(meanBias)}
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            {meanBias === null ? (
              <span>No matched data</span>
            ) : isOverforecast ? (
              <span className="text-teal-700 font-medium">Overforecast bias (Net Long risk)</span>
            ) : isUnderforecast ? (
              <span className="text-amber-700 font-medium">Underforecast bias (Net Short risk)</span>
            ) : (
              <span>Zero systematic bias</span>
            )}
          </div>
        </div>

        {/* 4. Data Completeness */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Data Completeness
            </span>
            {completeness === 100 ? (
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${
              completeness === 100 ? 'text-slate-900' : 'text-amber-700'
            }`}>
              {completeness.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span>
              {matchedRecordsCount} of {totalExpectedRecords} hourly intervals matched
            </span>
            {missingRecordsCount > 0 && (
              <span className="text-amber-600 font-medium">
                ({missingRecordsCount} missing)
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Context Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-400">Peak Actual:</span>{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatMW(metrics.peakActualMW)}
            </span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div>
            <span className="text-slate-400">Peak Forecast:</span>{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatMW(metrics.peakForecastMW)}
            </span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div>
            <span className="text-slate-400">Max Overforecast:</span>{' '}
            <span className="font-semibold text-teal-700 tabular-nums">
              {metrics.maxOverforecastMW !== null ? `+${formatMW(metrics.maxOverforecastMW)}` : '—'}
            </span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div>
            <span className="text-slate-400">Max Underforecast:</span>{' '}
            <span className="font-semibold text-amber-700 tabular-nums">
              {metrics.maxUnderforecastMW !== null ? `-${formatMW(metrics.maxUnderforecastMW)}` : '—'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Formula: <span className="font-mono text-slate-700">Error = Forecast − Actual</span>
        </div>
      </div>
    </div>
  );
};
