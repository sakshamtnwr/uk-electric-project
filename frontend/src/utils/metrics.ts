/**
 * UK Wind Forecast Accuracy - Calculation Engine
 * 
 * Strict implementation of forecasting accuracy metrics for energy utilities.
 * Handles missing / unmatched data safely without treating nulls as zero.
 */

import { HourlyRecord, ForecastMetrics } from '../types/energy';

export const TOTAL_HOURLY_PERIODS = 24;

/**
 * Calculates error for a record: forecast - actual.
 * Returns null if either forecast or actual is missing/null/undefined.
 */
export function calculateRecordError(forecastMW: number | null, actualMW: number | null): number | null {
  if (forecastMW === null || actualMW === null || isNaN(forecastMW) || isNaN(actualMW)) {
    return null;
  }
  return Number((forecastMW - actualMW).toFixed(2));
}

/**
 * Computes all forecast accuracy metrics across a set of hourly records.
 * Unmatched records (where either forecast or actual is missing) are strictly excluded
 * from MAE, RMSE, and Mean Bias calculations to avoid distorting energy statistics.
 */
export function calculateForecastMetrics(
  records: HourlyRecord[],
  expectedCount: number = TOTAL_HOURLY_PERIODS
): ForecastMetrics {
  // Filter for matched records only (both forecast and actual are present numbers)
  const matchedRecords = records.filter(
    (r): r is HourlyRecord & { forecastMW: number; actualMW: number; errorMW: number } =>
      r.forecastMW !== null &&
      r.actualMW !== null &&
      !isNaN(r.forecastMW) &&
      !isNaN(r.actualMW) &&
      r.errorMW !== null
  );

  const matchedCount = matchedRecords.length;
  const missingCount = expectedCount - matchedCount;
  const completeness = Number(((matchedCount / expectedCount) * 100).toFixed(1));

  if (matchedCount === 0) {
    return {
      mae: null,
      rmse: null,
      meanBias: null,
      completeness,
      matchedRecordsCount: 0,
      totalExpectedRecords: expectedCount,
      missingRecordsCount: expectedCount,
      peakActualMW: null,
      peakForecastMW: null,
      maxOverforecastMW: null,
      maxUnderforecastMW: null,
    };
  }

  // 1. Mean Absolute Error (MAE): sum(|forecast - actual|) / N
  const totalAbsoluteError = matchedRecords.reduce(
    (sum, r) => sum + Math.abs(r.forecastMW - r.actualMW),
    0
  );
  const mae = Number((totalAbsoluteError / matchedCount).toFixed(1));

  // 2. Root Mean Square Error (RMSE): sqrt( sum((forecast - actual)^2) / N )
  const totalSquaredError = matchedRecords.reduce(
    (sum, r) => sum + Math.pow(r.forecastMW - r.actualMW, 2),
    0
  );
  const rmse = Number(Math.sqrt(totalSquaredError / matchedCount).toFixed(1));

  // 3. Mean Bias: sum(forecast - actual) / N (signed average error)
  const totalSignedError = matchedRecords.reduce(
    (sum, r) => sum + (r.forecastMW - r.actualMW),
    0
  );
  const meanBias = Number((totalSignedError / matchedCount).toFixed(1));

  // Additional descriptive energy figures
  let peakActual: number | null = null;
  let peakForecast: number | null = null;
  let maxOver: number | null = null;
  let maxUnder: number | null = null;

  records.forEach((r) => {
    if (r.actualMW !== null) {
      if (peakActual === null || r.actualMW > peakActual) {
        peakActual = r.actualMW;
      }
    }
    if (r.forecastMW !== null) {
      if (peakForecast === null || r.forecastMW > peakForecast) {
        peakForecast = r.forecastMW;
      }
    }
    if (r.errorMW !== null) {
      if (r.errorMW > 0) {
        if (maxOver === null || r.errorMW > maxOver) {
          maxOver = r.errorMW;
        }
      } else if (r.errorMW < 0) {
        const magnitude = Math.abs(r.errorMW);
        if (maxUnder === null || magnitude > maxUnder) {
          maxUnder = magnitude;
        }
      }
    }
  });

  return {
    mae,
    rmse,
    meanBias,
    completeness,
    matchedRecordsCount: matchedCount,
    totalExpectedRecords: expectedCount,
    missingRecordsCount: missingCount > 0 ? missingCount : 0,
    peakActualMW: peakActual,
    peakForecastMW: peakForecast,
    maxOverforecastMW: maxOver,
    maxUnderforecastMW: maxUnder,
  };
}

/**
 * Format MW numbers nicely with comma thousands separator
 */
export function formatMW(val: number | null | undefined, includeUnit: boolean = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  const formatted = Math.round(val).toLocaleString('en-GB');
  return includeUnit ? `${formatted} MW` : formatted;
}

/**
 * Format signed error with explicit + or - sign
 */
export function formatSignedMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  const rounded = Number(val.toFixed(1));
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('en-GB')} MW`;
}
