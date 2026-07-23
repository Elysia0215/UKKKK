import React, { useMemo } from 'react';
import { DistrictData, SEOUL_DISTRICTS_DATA } from '../data/seoulData';
import { districtMapLayout } from '../data/seoul_districts_geo';
import { MapPin } from 'lucide-react';

interface Props {
  selectedDistrict: DistrictData;
  onSelectDistrict: (district: DistrictData) => void;
  colorMetric: 'births' | 'daycare' | 'fertility';
  showBackground: boolean;
  sortBy: 'name' | 'value';
}

const metricFill = {
  births: ['#ecfdf5', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'],
  daycare: ['#fffbeb', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b'],
  fertility: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'],
};

const getMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  switch (metric) {
    case 'births':
      return district.births2025;
    case 'daycare':
      return district.daycare2025;
    case 'fertility':
      return district.fertilityRate;
    default:
      return 0;
  }
};

const formatMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  const value = getMetricValue(district, metric);

  if (metric === 'fertility') return district.fertilityRate.toFixed(3);
  if (metric === 'births') return `${value.toLocaleString()}명`;
  return `${value.toLocaleString()}개소`;
};

export const SeoulMap: React.FC<Props> = ({ selectedDistrict, onSelectDistrict, colorMetric, showBackground, sortBy }) => {
    const metricBounds = useMemo(() => {
    const values = SEOUL_DISTRICTS_DATA.map((district) => getMetricValue(district, colorMetric));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [colorMetric]);

  const sortedDistricts = useMemo(() => {
    const list = [...SEOUL_DISTRICTS_DATA];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return list.sort((a, b) => getMetricValue(b, colorMetric) - getMetricValue(a, colorMetric));
  }, [colorMetric, sortBy]);

  const getFill = (district: DistrictData) => {
    const value = getMetricValue(district, colorMetric);
    const ratio = metricBounds.max === metricBounds.min ? 0 : (value - metricBounds.min) / (metricBounds.max - metricBounds.min);
    const index = Math.min(4, Math.max(0, Math.floor(ratio * 4)));
    return metricFill[colorMetric][index];
  };

  const topDistricts = sortedDistricts.slice(0, 6);

  return (
    <div className="relative w-full h-full">
      <div className="rounded-[32px] overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase text-slate-400 tracking-[0.32em] font-semibold">서울시 자치구 클릭형 지도</div>
            <h2 className="mt-2 text-lg font-bold">{colorMetric === 'births' ? '2025년 출생아 수' : colorMetric === 'daycare' ? '2025년 보육시설 수' : '2025년 합계출산율'} 기준</h2>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <p>{selectedDistrict.name} 선택됨</p>
            <p className="mt-1 text-slate-300">선택하면 오른쪽 데이터 패널에 반영됩니다.</p>
          </div>
        </div>

        <svg viewBox="0 0 800 550" className="w-full h-[500px] bg-slate-50" role="img" aria-label="서울시 자치구 실제 행정구역 지도">
          {showBackground && (
            <g opacity="0.28">
              <rect x="24" y="24" width="752" height="502" rx="30" fill="#e2e8f0" />
              <g stroke="#ffffff" strokeWidth="1.4" strokeDasharray="6 7">
                <line x1="80" y1="110" x2="720" y2="110" />
                <line x1="80" y1="220" x2="720" y2="220" />
                <line x1="80" y1="330" x2="720" y2="330" />
                <line x1="80" y1="440" x2="720" y2="440" />
              </g>
            </g>
          )}

          <defs>
            <filter id="publicMapShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.16" />
            </filter>
          </defs>

          {districtMapLayout.map((boundary) => {
            const district = SEOUL_DISTRICTS_DATA.find((item) => item.name === boundary.name);
            const isSelected = boundary.name === selectedDistrict.name;
            const fill = isSelected ? '#0A2351' : (district ? getFill(district) : '#f8fafc');
            const metricText = district ? formatMetricValue(district, colorMetric) : 'N/A';

            return (
              <g
                key={boundary.name}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                style={{
                  opacity: selectedDistrict?.name ? (isSelected ? 1 : 0.6) : 1,
                  transition: 'opacity 0.25s ease-in-out'
                }}
                onClick={() => district && onSelectDistrict(district)}
                onKeyDown={(event) => {
                  if (district && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelectDistrict(district);
                  }
                }}
              >
                <path
                  d={boundary.d}
                  fill={fill}
                  stroke={isSelected ? '#ef4444' : '#475569'}
                  strokeWidth={isSelected ? 3.4 : 1.2}
                  filter={isSelected ? 'url(#publicMapShadow)' : undefined}
                  opacity="0.96"
                  className="transition-all duration-150 hover:brightness-95"
                />
                <text
                  x={boundary.labelX}
                  y={boundary.labelY - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10.5"
                  fontWeight="900"
                  fill={isSelected ? '#ffffff' : '#0f172a'}
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: isSelected ? '#0A2351' : '#ffffff',
                    strokeWidth: '2.5px',
                    strokeLinejoin: 'round'
                  }}
                  className="pointer-events-none"
                >
                  {boundary.name}
                </text>
                <text
                  x={boundary.labelX}
                  y={boundary.labelY + 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9.5"
                  fontWeight="900"
                  fill={isSelected ? '#fde047' : '#1e3a8a'}
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: isSelected ? '#0A2351' : '#ffffff',
                    strokeWidth: '2px',
                    strokeLinejoin: 'round'
                  }}
                  className="pointer-events-none"
                >
                  {metricText}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="px-5 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topDistricts.map((district) => (
              <button
                key={district.name}
                type="button"
                onClick={() => onSelectDistrict(district)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  district.name === selectedDistrict.name
                    ? 'border-indigo-600 bg-indigo-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{district.name}</span>
                  <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">TOP</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {colorMetric === 'births' ? `${district.births2025.toLocaleString()}명 출생` :
                    colorMetric === 'daycare' ? `${district.daycare2025.toLocaleString()}개소` :
                    `합계출산율 ${district.fertilityRate.toFixed(3)}`}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-xs text-slate-500">현재 선택된 자치구</p>
              <p className="text-sm font-semibold text-slate-900">{selectedDistrict.name}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SeoulMap;
