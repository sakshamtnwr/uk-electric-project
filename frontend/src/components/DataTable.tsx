import React, { useState, useMemo } from 'react';
import { HourlyRecord } from '../types/energy';
import { formatMW, formatSignedMW } from '../utils/metrics';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface DataTableProps {
  records: HourlyRecord[];
  deliveryDate: string;
  onExportCsv: () => void;
  isLoading?: boolean;
}

type SortField = 'startTime' | 'forecastMW' | 'actualMW' | 'errorMW' | 'publishTime';
type SortOrder = 'asc' | 'desc';
type FilterCategory = 'all' | 'over' | 'under' | 'missing';

export const DataTable: React.FC<DataTableProps> = ({
  records,
  deliveryDate,
  onExportCsv,
  isLoading,
}) => {
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'startTime' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    // Filter Category
    if (filterCategory === 'over') {
      result = result.filter((r) => r.errorMW !== null && r.errorMW > 0);
    } else if (filterCategory === 'under') {
      result = result.filter((r) => r.errorMW !== null && r.errorMW < 0);
    } else if (filterCategory === 'missing') {
      result = result.filter((r) => r.forecastMW === null || r.actualMW === null);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.hourLabel.toLowerCase().includes(q) ||
          (r.publishTime && r.publishTime.toLowerCase().includes(q)) ||
          r.startTime.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle nulls in sorting: push nulls to the end
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (sortField === 'errorMW') {
        valA = Number(valA);
        valB = Number(valB);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, filterCategory, searchTerm, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 inline ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-600 inline ml-1" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="h-5 w-44 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      
      {/* Table Header & Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Delivery Day Settlement Ledger
            </h3>
            <span className="text-xs text-slate-500">
              ({filteredAndSortedRecords.length} records shown)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Error convention: <span className="font-mono text-slate-700">Forecast − Actual</span> (Positive = Overforecast, Negative = Underforecast)
          </p>
        </div>

        {/* Toolbar: Filters, Search, Export */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search by hour */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search time (e.g. 14:00)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-md bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 w-36 sm:w-44"
            />
          </div>

          {/* Filter Segmented Control */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (24)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('over')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterCategory === 'over'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Over (+)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('under')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterCategory === 'under'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Under (−)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('missing')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterCategory === 'missing'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Missing
            </button>
          </div>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
            title="Export this dataset to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              
              {/* Delivery Time */}
              <th
                onClick={() => handleSort('startTime')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Delivery Time (UTC)</span>
                {renderSortIcon('startTime')}
              </th>

              {/* Settlement Period */}
              <th className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                <span>Settlement Period</span>
              </th>

              {/* Forecast Generation */}
              <th
                onClick={() => handleSort('forecastMW')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Forecast Generation (MW)</span>
                {renderSortIcon('forecastMW')}
              </th>

              {/* Actual Generation */}
              <th
                onClick={() => handleSort('actualMW')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Actual Generation (MW)</span>
                {renderSortIcon('actualMW')}
              </th>

              {/* Forecast Error */}
              <th
                onClick={() => handleSort('errorMW')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Forecast Error (MW)</span>
                {renderSortIcon('errorMW')}
              </th>

              {/* Publication Time */}
              <th
                onClick={() => handleSort('publishTime')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Forecast Publication Time</span>
                {renderSortIcon('publishTime')}
              </th>

              {/* Status */}
              <th className="py-2.5 px-4 text-center whitespace-nowrap">
                <span>Matching Status</span>
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No records match the active filter or search criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedRecords.map((r, idx) => {
                const isMatched = r.forecastMW !== null && r.actualMW !== null;
                const isOver = r.errorMW !== null && r.errorMW > 0;
                const isUnder = r.errorMW !== null && r.errorMW < 0;

                return (
                  <tr
                    key={r.startTime}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Delivery Time */}
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {r.hourLabel} – {String((parseInt(r.hourLabel.slice(0, 2), 10) + 1) % 24).padStart(2, '0')}:00
                    </td>

                    {/* Settlement Period */}
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      SP {r.settlementPeriod} &amp; {r.settlementPeriod + 1}
                    </td>

                    {/* Forecast Generation */}
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-teal-800 font-medium whitespace-nowrap">
                      {formatMW(r.forecastMW)}
                    </td>

                    {/* Actual Generation */}
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold whitespace-nowrap">
                      {formatMW(r.actualMW)}
                    </td>

                    {/* Forecast Error */}
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                      {r.errorMW === null ? (
                        <span className="text-slate-400 font-normal italic">Unmatched</span>
                      ) : (
                        <span
                          className={
                            isOver
                              ? 'text-teal-700'
                              : isUnder
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }
                        >
                          {formatSignedMW(r.errorMW)}
                        </span>
                      )}
                    </td>

                    {/* Publication Time */}
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {r.publishTime ? (
                        <span>{r.publishTime.replace('T', ' ').replace('Z', ' UTC')}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not Published</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>Matched</span>
                        </span>
                      ) : r.actualMW === null ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium" title="Meter actual generation missing from settlement stream">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Missing Actual</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium" title="Forecast packet missing from meteorological feed">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Missing Forecast</span>
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          Delivery Day: <span className="font-semibold text-slate-700">{deliveryDate}</span> · Hourly Granularity
        </div>
        <div>
          Note: Missing records are strictly excluded from MAE and RMSE calculations without zero-substitution.
        </div>
      </div>

    </div>
  );
};
