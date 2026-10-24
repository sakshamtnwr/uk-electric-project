import { HourlyRecord, AnalysisResponse } from '../types/energy';

export function exportAnalysisToCsv(analysis: AnalysisResponse): void {
  const headers = [
    'Delivery Date',
    'Delivery Interval (UTC)',
    'Settlement Period',
    'Forecast MW',
    'Actual MW',
    'Error MW (Forecast - Actual)',
    'Forecast Publication Time',
    'Status',
  ];

  const rows = analysis.records.map((r) => {
    const isMatched = r.forecastMW !== null && r.actualMW !== null;
    const status = isMatched
      ? 'Matched'
      : r.actualMW === null
      ? 'Missing Actual'
      : 'Missing Forecast';

    return [
      analysis.deliveryDate,
      `"${r.hourLabel} - ${String((parseInt(r.hourLabel.slice(0, 2), 10) + 1) % 24).padStart(2, '0')}:00"`,
      r.settlementPeriod,
      r.forecastMW !== null ? r.forecastMW : '',
      r.actualMW !== null ? r.actualMW : '',
      r.errorMW !== null ? r.errorMW : '',
      r.publishTime || '',
      status,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `uk_wind_forecast_accuracy_${analysis.deliveryDate}_cutoff_${analysis.cutoffTime.replace(':', '')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
