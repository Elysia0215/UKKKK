import React, { useMemo } from 'react';
import { DistrictData, SEOUL_DISTRICTS_DATA } from '../data/seoulData';
import { districtMapLayout } from '../data/seoul_districts_geo';
import { MapPin } from 'lucide-react';

interface Props {
  selectedDistrict: DistrictData;
  onSelectDistrict: (district: DistrictData) => void;
  colorMetric: 'births' | 'daycare' | 'fertility' | 'proposals' | 'demandScore';
  showBackground: boolean;
  sortBy: 'name' | 'value';
}

const metricFill = {
  births: ['#ecfdf5', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'],
  daycare: ['#fffbeb', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b'],
  fertility: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'],
  proposals: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444'],
  demandScore: ['#faf5ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7'],
};

const getMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  switch (metric) {
    case 'births':
      return district.births2025;
    case 'daycare':
      return district.daycare2025;
    case 'fertility':
      return district.fertilityRate;
    case 'proposals':
      return district.proposals || 0;
    case 'demandScore':
      return district.demandScore || 0;
    default:
      return 0;
  }
};

const formatMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  const value = getMetricValue(district, metric);

  if (metric === 'fertility') return district.fertilityRate.toFixed(3);
  if (metric === 'births') return `${value.toLocaleString()}명`;
  if (metric === 'proposals') return `${value.toLocaleString()}건`;
  if (metric === 'demandScore') return `${value.toFixed(1)}점`;
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
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs p-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          
          {/* [좌측 10열] 기존 대형 크기 시원한 서울시 지도 */}
          <div className="lg:col-span-10 rounded-xl overflow-hidden border border-slate-200/60 bg-slate-50">
            <svg viewBox="0 0 800 550" className="w-full h-[480px] bg-slate-50" role="img" aria-label="서울시 자치구 실제 행정구역 지도">
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
          </div>

          {/* [우측 2열] 🏆 TOP 6 자치구 지도 오른쪽 세로 6행 패널 (Right Sidebar 6-Row Panel) */}
          <div className="lg:col-span-2 bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between h-full">
            <div className="pb-1.5 border-b border-slate-200 text-center">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                🏆 TOP 6 자치구
              </span>
              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                (1클릭 빠른 선택)
              </span>
            </div>

            <div className="flex flex-col gap-1.5 my-auto py-1">
              {topDistricts.map((district, idx) => (
                <button
                  key={district.name}
                  type="button"
                  onClick={() => onSelectDistrict(district)}
                  className={`w-full rounded-lg border p-2 text-left transition cursor-pointer shadow-2xs flex items-center justify-between gap-1 ${
                    district.name === selectedDistrict.name
                      ? 'border-indigo-600 bg-indigo-600 text-white font-black ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-mono px-1 rounded font-black ${
                      district.name === selectedDistrict.name ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      0{idx + 1}
                    </span>
                    <span className="text-[11px] truncate font-bold">{district.name}</span>
                  </div>

                  <span className={`text-[10px] font-mono shrink-0 ${district.name === selectedDistrict.name ? 'text-indigo-100' : 'text-slate-600 font-extrabold'}`}>
                    {colorMetric === 'births' ? `${district.births2025}명` :
                      colorMetric === 'daycare' ? `${district.daycare2025}개` :
                      colorMetric === 'proposals' ? `${district.proposals || 0}건` :
                      colorMetric === 'demandScore' ? `${(district.demandScore || 0).toFixed(1)}점` :
                      `${district.fertilityRate.toFixed(3)}`}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-1.5 border-t border-slate-200 text-center text-[9px] text-slate-400 font-medium">
              💡 순위 선택 시 지도 구역 강조
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SeoulMap;
