/**
 * UK Wind Forecast Accuracy Dashboard - Energy Data Types
 * Prepared for eventual Python FastAPI backend integration with Elexon BMRS datasets.
 */

export interface HourlyRecord {
  /** Delivery interval start timestamp (ISO 8601 string, e.g. 2026-01-15T00:00:00Z) */
  startTime: string;
  /** Human-readable hour label (e.g. "00:00", "01:00", ... "23:00") */
  hourLabel: string;
  /** Forecast wind generation in MW. Null if missing/unavailable. */
  forecastMW: number | null;
  /** Metered actual wind generation in MW. Null if missing/unsettled. */
  actualMW: number | null;
  /** Forecast publication timestamp. Null if not published. */
  publishTime: string | null;
  /** Forecast error in MW = forecastMW - actualMW (null if either is missing) */
  errorMW: number | null;
  /** Elexon Settlement Period reference (1-48 for half-hourly; for hourly records 1, 3, 5... or 1-24) */
  settlementPeriod: number;
}

export interface ForecastMetrics {
  /** Mean Absolute Error across matched records in MW */
  mae: number | null;
  /** Root Mean Square Error across matched records in MW */
  rmse: number | null;
  /** Mean signed bias across matched records in MW (forecast - actual) */
  meanBias: number | null;
  /** Percentage of expected records with both forecast and actual data (0 - 100) */
  completeness: number;
  /** Total count of records with both forecast and actual present */
  matchedRecordsCount: number;
  /** Total expected records for the delivery day (typically 24 for hourly resolution) */
  totalExpectedRecords: number;
  /** Number of unmatched or missing records */
  missingRecordsCount: number;
  /** Peak actual generation recorded in the day (MW) */
  peakActualMW: number | null;
  /** Peak forecast generation in the day (MW) */
  peakForecastMW: number | null;
  /** Maximum single-hour overforecast in MW */
  maxOverforecastMW: number | null;
  /** Maximum single-hour underforecast in MW */
  maxUnderforecastMW: number | null;
}

export interface AnalysisMetadata {
  targetFuel: string;
  systemZone: string;
  sourceActuals: string;
  sourceForecast: string;
  generatedAt: string;
  isDemoData: boolean;
  notes: string;
}

export interface AnalysisResponse {
  deliveryDate: string;
  cutoffTime: string;
  scenario: string;
  status: 'success' | 'partial' | 'empty' | 'error';
  records: HourlyRecord[];
  metrics: ForecastMetrics;
  metadata: AnalysisMetadata;
}

export type ScenarioType = 
  | 'standard' 
  | 'storm' 
  | 'dunkelflaute' 
  | 'missing_data'
  | 'empty_day';
