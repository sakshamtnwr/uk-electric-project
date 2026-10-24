import React, { useState, useMemo } from 'react';
import { HourlyRecord } from '../types/energy';
import { formatMW, formatSignedMW } from '../utils/metrics';
import { BarChart3, LineChart as LineChartIcon, Eye, EyeOff } from 'lucide-react';

interface WindChartProps {
  records: HourlyRecord[];
  deliveryDate: string;
  isLoading?: boolean;
}

export const WindChart: React.FC<WindChartProps> = ({ records, deliveryDate, isLoading }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'lines' | 'delta'>('lines');
  const [showErrorRibbon, setShowErrorRibbon] = useState<boolean>(true);

  // SVG canvas dimensions
  const width = 1000;
  const height = 400;
  const padding = { top: 30, right: 35, bottom: 45, left: 75 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute maximum MW for Y-axis scaling
  const { maxMW, minMW, maxAbsDelta } = useMemo(() => {
    let max = 5000;
    let min = 0;
    let maxDelta = 1000;

    records.forEach((r) => {
      if (r.actualMW !== null && r.actualMW > max) max = r.actualMW;
      if (r.forecastMW !== null && r.forecastMW > max) max = r.forecastMW;
      if (r.errorMW !== null && Math.abs(r.errorMW) > maxDelta) {
        maxDelta = Math.abs(r.errorMW);
      }
    });

    // Round up maxMW to clean grid intervals (e.g. nearest 2,500 MW)
    const ceilStep = max > 12000 ? 5000 : 2500;
    const roundedMax = Math.ceil((max * 1.1) / ceilStep) * ceilStep;
    const roundedMaxDelta = Math.ceil((maxDelta * 1.25) / 500) * 500;

    return { maxMW: roundedMax, minMW: 0, maxAbsDelta: roundedMaxDelta };
  }, [records]);

  // Coordinate scales
  const getX = (index: number) => {
    if (records.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (records.length - 1)) * innerWidth;
  };

  const getYMW = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(minMW, Math.min(maxMW, val));
    return padding.top + innerHeight - ((clamped - minMW) / (maxMW - minMW)) * innerHeight;
  };

  const getYDelta = (val: number | null) => {
    if (val === null) return null;
    const zeroY = padding.top + innerHeight / 2;
    const yDelta = (val / maxAbsDelta) * (innerHeight / 2);
    return zeroY - yDelta;
  };

  // Generate SVG path for Actual line (handling nulls with gap breaks)
  const actualPath = useMemo(() => {
    let d = '';
    let inSubpath = false;

    records.forEach((r, i) => {
      const y = getYMW(r.actualMW);
      if (y !== null) {
        const x = getX(i);
        if (!inSubpath) {
          d += `M ${x} ${y} `;
          inSubpath = true;
        } else {
          d += `L ${x} ${y} `;
        }
      } else {
        inSubpath = false;
      }
    });

    return d;
  }, [records, maxMW]);

  // Generate SVG path for Forecast line
  const forecastPath = useMemo(() => {
    let d = '';
    let inSubpath = false;

    records.forEach((r, i) => {
      const y = getYMW(r.forecastMW);
      if (y !== null) {
        const x = getX(i);
        if (!inSubpath) {
          d += `M ${x} ${y} `;
          inSubpath = true;
        } else {
          d += `L ${x} ${y} `;
        }
      } else {
        inSubpath = false;
      }
    });

    return d;
  }, [records, maxMW]);

  // Generate polygon ribbon between Forecast and Actual for matched intervals
  const errorRibbonPolygons = useMemo(() => {
    if (!showErrorRibbon) return [];

    const segments: { d: string; isOver: boolean }[] = [];

    for (let i = 0; i < records.length - 1; i++) {
      const r1 = records[i];
      const r2 = records[i + 1];

      if (
        r1.actualMW !== null &&
        r1.forecastMW !== null &&
        r2.actualMW !== null &&
        r2.forecastMW !== null
      ) {
        const x1 = getX(i);
        const x2 = getX(i + 1);
        const yF1 = getYMW(r1.forecastMW)!;
        const yA1 = getYMW(r1.actualMW)!;
        const yF2 = getYMW(r2.forecastMW)!;
        const yA2 = getYMW(r2.actualMW)!;

        // Is average error overforecast or underforecast?
        const isOver = (r1.forecastMW + r2.forecastMW) / 2 >= (r1.actualMW + r2.actualMW) / 2;

        const pathD = `M ${x1} ${yF1} L ${x2} ${yF2} L ${x2} ${yA2} L ${x1} ${yA1} Z`;
        segments.push({ d: pathD, isOver });
      }
    }

    return segments;
  }, [records, maxMW, showErrorRibbon]);

  // Y-axis grid increments for Line Chart
  const yTicksMW = useMemo(() => {
    const count = 5;
    const ticks = [];
    const step = maxMW / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round(i * step));
    }
    return ticks;
  }, [maxMW]);

  // Y-axis grid increments for Delta Chart
  const yTicksDelta = useMemo(() => {
    return [-maxAbsDelta, -Math.round(maxAbsDelta / 2), 0, Math.round(maxAbsDelta / 2), maxAbsDelta];
  }, [maxAbsDelta]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="h-[340px] bg-slate-100 rounded animate-pulse flex items-center justify-center text-slate-400 text-sm">
          Generating hourly forecast curves...
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <LineChartIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No chart records available</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          The selected delivery date has zero recorded observations. Choose an active January 2026 delivery day.
        </p>
      </div>
    );
  }

  const activeRecord = hoveredIndex !== null ? records[hoveredIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Hourly Wind Generation: Forecast vs Actual
            </h2>
            <span className="text-xs text-slate-500">
              ({deliveryDate})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            24-hour delivery day aggregated to Settlement Periods (SP 1–48)
          </p>
        </div>

        {/* View Switcher & Options */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {chartMode === 'lines' && (
            <button
              type="button"
              onClick={() => setShowErrorRibbon(!showErrorRibbon)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              title="Toggle shaded error difference band"
            >
              {showErrorRibbon ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showErrorRibbon ? 'Hide Delta Band' : 'Show Delta Band'}</span>
            </button>
          )}

          {/* Segmented control for Chart Mode */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('lines')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                chartMode === 'lines'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5 text-teal-600" />
              <span>Generation (MW)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('delta')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                chartMode === 'delta'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Error Delta (MW)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-3 pb-2 text-xs text-slate-600">
        <div className="flex items-center gap-5 flex-wrap">
          {chartMode === 'lines' ? (
            <>
              {/* Actual Line Swatch */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-slate-900 inline-block"></span>
                <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                <span className="font-semibold text-slate-900">Actual Metered Generation</span>
                <span className="text-slate-400 text-[11px]">(Elexon FUELHH)</span>
              </div>

              {/* Forecast Line Swatch */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-teal-600 inline-block"></span>
                <span className="w-2 h-2 rotate-45 bg-teal-600 inline-block"></span>
                <span className="font-semibold text-teal-700">Day-Ahead Forecast</span>
                <span className="text-slate-400 text-[11px]">(Elexon WINDFOR)</span>
              </div>

              {/* Shaded Area Swatch */}
              {showErrorRibbon && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3.5 h-3 bg-teal-200/50 border border-teal-400/50 rounded-xs inline-block"></span>
                  <span>Forecast Error Ribbon (Gap between curves)</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-600 rounded-xs inline-block"></span>
                <span className="font-semibold text-teal-800">Overforecast (+MW)</span>
                <span className="text-slate-400 text-[11px]">Forecast &gt; Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-600 rounded-xs inline-block"></span>
                <span className="font-semibold text-amber-800">Underforecast (-MW)</span>
                <span className="text-slate-400 text-[11px]">Forecast &lt; Actual</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-400 italic">
          Units: Megawatts (MW) · All hours in UTC
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Background Canvas */}
          <rect
            x={padding.left}
            y={padding.top}
            width={innerWidth}
            height={innerHeight}
            fill="#fcfcfd"
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Mode 1: Line Chart View */}
          {chartMode === 'lines' && (
            <>
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicksMW.map((tick) => {
                const y = getYMW(tick)!;
                return (
                  <g key={tick}>
                    <line
                      x1={padding.left}
                      x2={padding.left + innerWidth}
                      y1={y}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[11px] fill-slate-500 font-mono tabular-nums"
                    >
                      {tick.toLocaleString('en-GB')}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Error Ribbon Between Curves */}
              {showErrorRibbon &&
                errorRibbonPolygons.map((seg, idx) => (
                  <path
                    key={idx}
                    d={seg.d}
                    fill={seg.isOver ? 'rgba(13, 148, 136, 0.16)' : 'rgba(217, 119, 6, 0.16)'}
                    stroke="none"
                  />
                ))}

              {/* Forecast Line */}
              <path
                d={forecastPath}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Actual Line */}
              <path
                d={actualPath}
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Markers */}
              {records.map((r, i) => {
                const x = getX(i);
                const yA = getYMW(r.actualMW);
                const yF = getYMW(r.forecastMW);
                const isHovered = hoveredIndex === i;

                return (
                  <g key={i}>
                    {yF !== null && (
                      <rect
                        x={x - (isHovered ? 4.5 : 3)}
                        y={yF - (isHovered ? 4.5 : 3)}
                        width={isHovered ? 9 : 6}
                        height={isHovered ? 9 : 6}
                        transform={`rotate(45 ${x} ${yF})`}
                        fill="#0d9488"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                    {yA !== null && (
                      <circle
                        cx={x}
                        cy={yA}
                        r={isHovered ? 5 : 3.5}
                        fill="#0f172a"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* Mode 2: Error Delta Bar View */}
          {chartMode === 'delta' && (
            <>
              {/* Zero Reference Line */}
              <line
                x1={padding.left}
                x2={padding.left + innerWidth}
                y1={getYDelta(0)!}
                y2={getYDelta(0)!}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />

              {/* Delta Y-Axis Gridlines */}
              {yTicksDelta.map((tick) => {
                const y = getYDelta(tick)!;
                return (
                  <g key={tick}>
                    <line
                      x1={padding.left}
                      x2={padding.left + innerWidth}
                      y1={y}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[11px] fill-slate-500 font-mono tabular-nums"
                    >
                      {tick > 0 ? `+${tick}` : tick}
                    </text>
                  </g>
                );
              })}

              {/* Delta Bars */}
              {records.map((r, i) => {
                if (r.errorMW === null) return null;
                const x = getX(i);
                const zeroY = getYDelta(0)!;
                const y = getYDelta(r.errorMW)!;
                const isOver = r.errorMW >= 0;
                const barHeight = Math.abs(y - zeroY);
                const barY = isOver ? y : zeroY;
                const barWidth = Math.max(12, innerWidth / 36);

                return (
                  <g key={i}>
                    <rect
                      x={x - barWidth / 2}
                      y={barY}
                      width={barWidth}
                      height={Math.max(2, barHeight)}
                      fill={isOver ? '#0d9488' : '#d97706'}
                      opacity={hoveredIndex === i ? 1 : 0.85}
                      rx="2"
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* Vertical X-Axis Hour Ticks */}
          {records.map((r, i) => {
            const x = getX(i);
            const isLabeledHour = i % 2 === 0 || i === records.length - 1;

            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top + innerHeight}
                  y2={padding.top + innerHeight + (isLabeledHour ? 6 : 3)}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {isLabeledHour && (
                  <text
                    x={x}
                    y={padding.top + innerHeight + 20}
                    textAnchor="middle"
                    className="text-[11px] fill-slate-600 font-mono"
                  >
                    {r.hourLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Crosshair Tracking Line */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              x2={getX(hoveredIndex)}
              y1={padding.top}
              y2={padding.top + innerHeight}
              stroke="#0f172a"
              strokeWidth="1.25"
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}

          {/* Invisible Interactive Columns for Scrubbing */}
          {records.map((_, i) => {
            const colWidth = innerWidth / records.length;
            const x = getX(i) - colWidth / 2;

            return (
              <rect
                key={i}
                x={x}
                y={padding.top}
                width={colWidth}
                height={innerHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
                onTouchStart={() => setHoveredIndex(i)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activeRecord && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-3 rounded-lg shadow-xl text-xs backdrop-blur-xs border border-slate-700 min-w-[210px]"
            style={{
              left: `${Math.min(
                Math.max(10, ((getX(hoveredIndex!) / width) * 100)),
                75
              )}%`,
              top: '12%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
              <span>{activeRecord.hourLabel} Delivery</span>
              <span className="text-[11px] text-slate-400 font-mono">
                SP {activeRecord.settlementPeriod}
              </span>
            </div>

            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  Actual:
                </span>
                <span className="font-bold text-white font-mono tabular-nums">
                  {formatMW(activeRecord.actualMW)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-teal-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 bg-teal-400"></span>
                  Forecast:
                </span>
                <span className="font-bold text-teal-300 font-mono tabular-nums">
                  {formatMW(activeRecord.forecastMW)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-300">Error (F − A):</span>
                <span
                  className={`font-bold font-mono tabular-nums ${
                    activeRecord.errorMW === null
                      ? 'text-slate-400'
                      : activeRecord.errorMW > 0
                      ? 'text-teal-400'
                      : activeRecord.errorMW < 0
                      ? 'text-amber-400'
                      : 'text-slate-200'
                  }`}
                >
                  {formatSignedMW(activeRecord.errorMW)}
                </span>
              </div>

              {activeRecord.publishTime && (
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>Published:</span>
                  <span className="font-mono text-slate-300">
                    {activeRecord.publishTime.replace('T', ' ').replace('Z', ' UTC')}
                  </span>
                </div>
              )}

              {activeRecord.actualMW === null && (
                <div className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded text-center">
                  Meter telemetry missing — excluded from MAE
                </div>
              )}
              {activeRecord.forecastMW === null && (
                <div className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded text-center">
                  Forecast packet missing — excluded from MAE
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Axis Guide */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <div>Delivery Time (00:00 to 23:00 GMT/UTC)</div>
        <div>Hover / drag over chart to inspect hourly settlement periods</div>
      </div>
    </div>
  );
};
