/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MapPin, ArrowUpDown, Download, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { PolicyProposal } from '../types';
import { SEOUL_DISTRICTS } from '../data/mockData';
import { districtStats } from '../data/mockData';
import { districtMapLayout } from '../data/seoul_districts_geo';
import { exportToCsv } from '../utils/exportCsv';

interface Props {
  proposals: PolicyProposal[];
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const DistrictComparison: React.FC<Props> = ({
  proposals,
  selectedDistrict,
  onSelectDistrict
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleExportDistrictStats = () => {
    const exportData = districtStats.map(d => ({
      '자치구명': d.district_name || d.district,
      '합계출산율(TFR)': d.fertility_rate || d.tfr || 'N/A',
      '총출생아수(2024)': d.total_births || d.births_total || 0,
      '보육시설수(2025)': d.daycare_centers || d.childcare_facility_count || 0
    }));
    exportToCsv(`서울시_25개자치구_출생_보육통계_${new Date().toISOString().split('T')[0]}.csv`, exportData);
  };

  const selectedDistrictStat = useMemo(() => {
    if (!selectedDistrict) return null;
    return districtStats.find(s => s.district === selectedDistrict) || null;
  }, [selectedDistrict]);

  const districtData = useMemo(() => {
    return districtStats
      .map(d => ({
        name: d.district,
        births: d.births_total || 0,
        daycare: d.childcare_facility_count || 0
      }))
      .sort((a, b) => (sortOrder === 'desc' ? b.births - a.births : a.births - b.births));
  }, [sortOrder]);

  const districtMapData = useMemo(() => {
    const maxBirths = Math.max(...districtStats.map(s => s.births_total || 1), 1);

    return districtMapLayout.map(item => {
      const stat = districtStats.find(entry => entry.district === item.name);
      const births = stat?.births_total ?? 0;
      const isSelected = selectedDistrict === item.name;
      const normalized = births / maxBirths;

      let fill = '#f1f5f9';
      if (isSelected) {
        fill = '#0A2351';
      } else if (births > 0) {
        const opacity = 0.2 + normalized * 0.7;
        fill = `rgba(37, 99, 235, ${opacity})`;
      }

      return {
        ...item,
        count: 0,
        avgVote: 0,
        births,
        childcare: stat?.childcare_facility_count ?? 0,
        fill,
        isSelected,
      };
    });
  }, [selectedDistrict]);

  const districtChartData = useMemo(() => {
    return SEOUL_DISTRICTS.map(dist => {
      const stat = districtStats.find(s => s.district === dist);
      const facilityCount = stat?.childcare_facility_count ?? 0;
      return {
        district: dist,
        '출생아수(명)': stat?.births_total ?? 0,
        '보육시설수(개소)': facilityCount,
        '합계출산율': stat?.tfr ?? stat?.fertility_rate ?? 0
      };
    }).sort((a, b) => (sortOrder === 'desc' ? b['출생아수(명)'] - a['출생아수(명)'] : a['출생아수(명)'] - b['출생아수(명)']));
  }, [sortOrder]);

  return (
    <div className="space-y-6">
      {/* 1. 2D SVG 지도 및 요약 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        {/* 좌측 지도 패널 (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="text-blue-600 w-5 h-5" />
                서울시 행정구역 지도 (2D 경계선)
              </h4>
            </div>
            <button
              onClick={handleExportDistrictStats}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2351] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
              title="25개 자치구별 통계 CSV 다운로드"
            >
              <Download className="w-3.5 h-3.5" /> 통계 CSV
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 relative flex items-center justify-center">
            <svg viewBox="0 0 800 550" className="w-full h-[360px] select-none">
              <defs>
                <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                </filter>
              </defs>

              {districtMapData.map(item => (
                <g
                  key={item.name}
                  onClick={() => onSelectDistrict(item.isSelected ? null : item.name)}
                  className="cursor-pointer group transition-all duration-200"
                  role="button"
                  tabIndex={0}
                  style={{
                    opacity: selectedDistrict ? (item.isSelected ? 1 : 0.6) : 1,
                    transition: 'opacity 0.25s ease-in-out'
                  }}
                >
                  <path
                    d={item.d}
                    fill={item.fill}
                    stroke={item.isSelected ? '#ef4444' : '#475569'}
                    strokeWidth={item.isSelected ? 3 : 1.2}
                    filter={item.isSelected ? 'url(#mapShadow)' : undefined}
                    className="transition-all duration-150 group-hover:fill-[#1e40af] group-hover:stroke-blue-400 group-hover:opacity-90"
                  />
                  
                  {/* 자치구 이름 라벨 */}
                  <text
                    x={item.labelX}
                    y={item.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] font-black pointer-events-none"
                    fill={item.isSelected ? '#ffffff' : '#0f172a'}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: item.isSelected ? '#0A2351' : '#ffffff',
                      strokeWidth: '2.5px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {item.name}
                  </text>
                </g>
              ))}
            </svg>

            {/* 범례 표시 */}
            <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-bold flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f1f5f9] border border-slate-300" /> 데이터 없음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[rgba(37,99,235,0.2)]" /> 출생아수 적음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[rgba(37,99,235,0.9)]" /> 출생아수 많음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0A2351] border border-red-500" /> 선택됨
              </span>
            </div>
          </div>
        </div>

        {/* 우측 요약 카드 패널 (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
          <div className="bg-[#0A2351] text-white rounded-xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
            <span className="text-[11px] uppercase text-blue-200 tracking-[0.3em] font-bold">Selected district</span>
            <h2 className="text-3xl font-black text-white mt-4">
              {selectedDistrict || '자치구를 선택하세요'}
            </h2>
            <p className="mt-2 text-xs text-slate-300">
              지도 구역 또는 아래 칩 버튼을 클릭하면 해당 자치구의 통계 요약이 즉시 갱신됩니다.
            </p>
            {selectedDistrict ? (
              <div className="mt-6 grid grid-cols-2 gap-3 text-slate-800">
                <div className="rounded-xl bg-white p-4 border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 tracking-[0.2em] font-semibold">출생아 수</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {selectedDistrictStat?.births_total?.toLocaleString() ? `${selectedDistrictStat.births_total.toLocaleString()}명` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">2024년 기준</p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 tracking-[0.2em] font-semibold">보육시설 수</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {selectedDistrictStat?.childcare_facility_count?.toLocaleString() ? `${selectedDistrictStat.childcare_facility_count.toLocaleString()}개소` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">2025년 기준</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-300">
                자치구를 클릭하여 상세 지표를 조회하세요.
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            💡 <strong>공공데이터 지표 비교분석 가이드</strong>: 위 3D 지도와 아래 2D 행정구역 지도는 실시간 동기화되어 움직입니다. 2D 지도의 음영은 해당 자치구의 **연간 출생아수 규모**에 비례하여 진해집니다.
          </p>
        </div>
      </div>

      {/* 2. 자치구별 출생아수 vs 보육시설수 이중축 분석 차트 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-blue-600 w-5 h-5" />
              자치구별 공공 출생·보육 인프라 지표 비교 분석
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              꺾은선 그래프(좌측 축: 총 출생아 수(명) / 우측 축: 보육시설 수(개소))를 통해 지역별 출생 지표 대비 돌봄 인프라 공급 추세를 종합 검토할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={districtChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
              <YAxis yAxisId="left" orientation="left" stroke="#e11d48" tick={{ fontSize: 11 }} label={{ value: '출생아수(명)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} label={{ value: '보육시설수(개소)', angle: 90, position: 'insideRight', fontSize: 10 }} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name.includes('보육시설')) {
                    return [`${Number(value).toLocaleString()}개소`, '보육시설 수'];
                  }
                  if (name.includes('출생아')) {
                    return [`${Number(value).toLocaleString()}명`, '총 출생아 수'];
                  }
                  return [value, name];
                }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="출생아수(명)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="보육시설수(개소)" name="보육시설수(개소)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. 25개 자치구 퀵 필터 그리드 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-800">25개 자치구 퀵 선택</p>
              <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                출생아수 통계 기준
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              현재 정렬 방식: <strong className="text-indigo-600 font-extrabold">{sortOrder === 'desc' ? '출생아수 많은 순 (내림차순)' : '출생아수 적은 순 (오름차순)'}</strong>
            </p>
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs self-start sm:self-auto"
            title="아래 25개 자치구 칩 및 비교 차트의 정렬 순서를 내림차순/오름차순으로 전환합니다."
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>{sortOrder === 'desc' ? '출생아수 높은 순 (내림차순)' : '출생아수 낮은 순 (오름차순)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5">
          {districtData.map(item => {
            const dist = item.name;
            const births = item.births;
            const isSelected = selectedDistrict === dist;
            
            return (
              <button
                key={dist}
                onClick={() => onSelectDistrict(isSelected ? null : dist)}
                className={`text-[11px] py-1.5 px-1 rounded-lg font-bold border transition duration-150 flex flex-col items-center justify-center cursor-pointer ${
                  isSelected 
                    ? 'bg-red-500 text-white border-red-600 shadow-sm ring-2 ring-red-200' 
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200 hover:border-indigo-400' 
                }`}
                title={`${dist}: 연간 출생아수 ${births.toLocaleString()}명`}
              >
                <span>{dist}</span>
                <span className={`text-[9px] mt-0.5 font-mono ${isSelected ? 'text-red-100 font-extrabold' : 'text-slate-500'}`}>
                  ({births.toLocaleString()}명)
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
