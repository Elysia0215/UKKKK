import React, { useMemo } from 'react';
import { DistrictData, SEOUL_DISTRICTS_DATA } from '../data/seoulData';
import { districtMapLayout } from '../data/seoul_districts_geo';

interface Props {
  selectedDistrict: DistrictData;
  onSelectDistrict: (district: DistrictData) => void;
  colorMetric: 'proposals' | 'births' | 'daycare' | 'fertility' | 'demand' | 'demandScore';
  showBackground: boolean;
  sortBy: 'name' | 'value';
}

const metricFill = {
  proposals: ['#eff6ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1'],
  births: ['#ecfdf5', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'],
  daycare: ['#fffbeb', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b'],
  fertility: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'],
  demand: ['#fff1f2', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e'],
  demandScore: ['#fff1f2', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e'],
};

const getMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  switch (metric) {
    case 'proposals':
      return district.proposals;
    case 'births':
      return district.births2025;
    case 'daycare':
      return district.daycare2025;
    case 'demand':
    case 'demandScore':
      return district.demandScore;
    case 'fertility':
      return district.fertilityRate;
    default:
      return 0;
  }
};

const formatMetricValue = (district: DistrictData, metric: Props['colorMetric']) => {
  const value = getMetricValue(district, metric);

  if (metric === 'fertility') return district.fertilityRate.toFixed(3);
  if (metric === 'demand' || metric === 'demandScore') return `${value}점`;
  if (metric === 'proposals') return `${value}건`;
  if (metric === 'births') return `${value.toLocaleString()}명`;
  return `${value.toLocaleString()}개소`;
};

export const SeoulMap: React.FC<Props> = ({ selectedDistrict, onSelectDistrict, colorMetric, showBackground }) => {
  const metricBounds = useMemo(() => {
    const values = SEOUL_DISTRICTS_DATA.map((district) => getMetricValue(district, colorMetric));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [colorMetric]);

  const getFill = (district: DistrictData) => {
    const value = getMetricValue(district, colorMetric);
    const ratio = metricBounds.max === metricBounds.min ? 0 : (value - metricBounds.min) / (metricBounds.max - metricBounds.min);
    const index = Math.min(4, Math.max(0, Math.floor(ratio * 4)));
    return metricFill[colorMetric][index];
  };

  return (
    <div className="w-full flex items-center justify-center">
      <svg 
        viewBox="0 0 800 520" 
        className="w-full h-auto max-h-[380px] bg-transparent" 
        role="img" 
        aria-label="서울시 자치구 실제 행정구역 지도"
      >
        {showBackground && (
          <g opacity="0.1">
            <rect x="24" y="24" width="752" height="472" rx="20" fill="#e2e8f0" />
            <g stroke="#ffffff" strokeWidth="1.4" strokeDasharray="6 7">
              <line x1="80" y1="100" x2="720" y2="100" />
              <line x1="80" y1="200" x2="720" y2="200" />
              <line x1="80" y1="300" x2="720" y2="300" />
              <line x1="80" y1="400" x2="720" y2="400" />
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
                opacity: selectedDistrict?.name ? (isSelected ? 1 : 0.75) : 1,
                transition: 'opacity 0.2s ease-in-out'
              }}
              onClick={() => district && onSelectDistrict(district)}
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
                fontSize="11"
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
                fontSize="10"
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
  );
};
