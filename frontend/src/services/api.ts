/**
 * Client for the Python FastAPI backend.
 *
 * Local default: http://localhost:8000
 * Deployment: set VITE_API_BASE_URL to the deployed backend URL in Vercel.
 */

import type { AnalysisResponse } from '../types/energy';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

function describeApiError(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg);
        }
        return '';
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  return `The analysis API request failed (HTTP ${status}).`;
}

/**
 * Request analysis for a purchase-decision date in January 2026.
 * The backend interprets delivery as the following calendar day.
 */
export async function getAnalysis(
  decisionDate: string,
  cutoffTime: string = '12:00',
): Promise<AnalysisResponse> {
  if (!decisionDate) {
    throw new Error('Please select a purchase decision date.');
  }

  const query = new URLSearchParams({
    decision_date: decisionDate,
    cutoff_time: cutoffTime,
  });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/analysis?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      `Could not reach the backend at ${API_BASE_URL}. Check that FastAPI is running and that VITE_API_BASE_URL is correct.`,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : undefined;
    throw new Error(describeApiError(detail, response.status));
  }

  if (!payload || typeof payload !== 'object' || !('records' in payload) || !('metrics' in payload)) {
    throw new Error('The backend returned an unexpected response format.');
  }

  return payload as AnalysisResponse;
}
