/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ThumbsUp, MessageSquare, HelpCircle, CheckCircle, ArrowUpDown, ExternalLink, Download, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
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
import { formatProposalContent } from '../utils/formatText';

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
  const [civilModalOpen, setCivilModalOpen] = useState(false);
  const [civilCategory, setCivilCategory] = useState('전체');

  const handleExportDistrictStats = () => {
    const exportData = districtStats.map(d => ({
      '자치구명': d.district_name || d.district,
      '합계출산율(TFR)': d.fertility_rate || d.tfr || 'N/A',
      '총출생아수(2024)': d.total_births || d.births_total || 0,
      '보육시설수(2025)': d.daycare_centers || d.childcare_facility_count || 0
    }));
    exportToCsv(`서울시_25개자치구_출생_보육통계_${new Date().toISOString().split('T')[0]}.csv`, exportData);
  };

  const districtData = useMemo(() => {
    const counts = SEOUL_DISTRICTS.reduce((acc, dist) => {
      acc[dist] = { count: 0, avgVote: 0, totalVote: 0 };
      return acc;
    }, {} as Record<string, { count: number; avgVote: number; totalVote: number }>);

    proposals.forEach(prop => {
      if (counts[prop.district]) {
        counts[prop.district].count += 1;
        counts[prop.district].totalVote += prop.vote_score;
      }
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgVote: stats.count > 0 ? Math.round(stats.totalVote / stats.count) : 0
      }))
      .sort((a, b) => (sortOrder === 'desc' ? b.count - a.count : a.count - b.count));
  }, [proposals, sortOrder]);

  const districtMapData = useMemo(() => {
    const maxCount = Math.max(...districtData.map(item => item.count), 1);

    return districtMapLayout.map(item => {
      const districtEntry = districtData.find(entry => entry.name === item.name) ?? { name: item.name, count: 0, avgVote: 0 };
      const stat = districtStats.find(entry => entry.district === item.name);
      const isSelected = selectedDistrict === item.name;
      const normalized = districtEntry.count / maxCount;

      let fill = '#f1f5f9';
      if (isSelected) {
        fill = '#0A2351';
      } else if (districtEntry.count > 0) {
        // 서울시 시그니처 블루 계열 그라데이션
        const opacity = 0.35 + normalized * 0.55;
        fill = `rgba(37, 99, 235, ${opacity})`;
      }

      return {
        ...item,
        count: districtEntry.count,
        avgVote: districtEntry.avgVote,
        births: stat?.births_total ?? 0,
        childcare: stat?.childcare_facility_count ?? 0,
        fill,
        isSelected,
      };
    });
  }, [districtData, selectedDistrict]);

  const selectedDistrictDetail = districtData.find(item => item.name === selectedDistrict);
  const selectedDistrictStat = districtStats.find(stat => stat.district === selectedDistrict);

  // 25개 자치구 제안 수량 vs 출생아수 & 보육시설수 비교 차트 데이터
  const districtChartData = useMemo(() => {
    return SEOUL_DISTRICTS.map(dist => {
      const propCount = proposals.filter(p => p.district === dist).length;
      const stat = districtStats.find(s => s.district === dist);
      const facilityCount = stat?.childcare_facility_count ?? 0;
      return {
        district: dist,
        '시민 제안수': propCount,
        '출생아수(명)': stat?.births_total ?? 0,
        '보육시설수(개)': facilityCount,
        '보육시설수(x10개)': facilityCount * 10,
        '합계출산율': stat?.tfr ?? stat?.fertility_rate ?? 0
      };
    }).sort((a, b) => (sortOrder === 'desc' ? b['시민 제안수'] - a['시민 제안수'] : a['시민 제안수'] - b['시민 제안수']));
  }, [proposals, sortOrder]);

  const filteredProposals = useMemo(() => {
    if (!selectedDistrict) return [];
    return proposals.filter(p => p.district === selectedDistrict);
  }, [proposals, selectedDistrict]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition">
        <div className="mb-4 pb-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="text-emerald-600 w-5 h-5" />
              서울시 행정구역 지도 (실제 25개 자치구 경계 시각화)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              실제 행정구역 지도를 클릭하여 각 자치구의 정밀 제안 현황과 공공 통계(출생아수, 보육시설수)를 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDistrictStats}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
              title="25개 자치구별 출생 및 보육 통계 CSV 다운로드"
            >
              <Download className="w-3.5 h-3.5" /> 통계 CSV
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* 실제 서울시 25개 자치구 행정경계 GeoJSON SVG 지도 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 relative flex items-center justify-center">
            <svg viewBox="0 0 800 550" className="w-full h-[400px] select-none">
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
                  
                  {/* 자치구 이름 & 건수 라벨 */}
                  <text
                    x={item.labelX}
                    y={item.labelY - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] font-black pointer-events-none"
                    fill={item.isSelected ? '#ffffff' : item.count > 0 ? '#0f172a' : '#475569'}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: item.isSelected ? '#0A2351' : '#ffffff',
                      strokeWidth: '2.5px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {item.name}
                  </text>
                  <text
                    x={item.labelX}
                    y={item.labelY + 9}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-black pointer-events-none"
                    fill={item.isSelected ? '#fde047' : item.count > 0 ? '#1d4ed8' : '#64748b'}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: item.isSelected ? '#0A2351' : '#ffffff',
                      strokeWidth: '2px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {item.count > 0 ? `${item.count}건` : '0건'}
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
                <span className="w-2.5 h-2.5 rounded-xs bg-[#60a5fa]" /> 제안 적음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1d4ed8]" /> 제안 많음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0A2351] border border-red-500" /> 선택됨
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">선택된 자치구</p>
              <h5 className="mt-2 text-base font-bold text-slate-900">
                {selectedDistrict || '클릭해서 자치구를 선택하세요'}
              </h5>
              {selectedDistrict ? (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span>제안 건수</span>
                    <span className="font-bold text-slate-900">{selectedDistrictDetail?.count ?? 0}건</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span>출생아수(2024)</span>
                    <span className="font-bold text-slate-900">{selectedDistrictStat?.births_total?.toLocaleString() ?? 'N/A'}명</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span>보육시설수(2025)</span>
                    <span className="font-bold text-slate-900">{selectedDistrictStat?.childcare_facility_count?.toLocaleString() ?? 'N/A'}개</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  지도에서 자치구를 선택하면 제안 수, 출생아수, 보육시설수 요약이 여기에 표시됩니다.
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-400 italic font-semibold">
          * 지도 구역을 클릭하면 해당 자치구의 시민 제안 목록이 바로 아래에 표시됩니다. 색이 진할수록 제안 건수가 많습니다.
        </p>
      </div>

      {/* 25개 자치구 시민 제안수 vs 출생아수 & 보육시설수 이중축 분석 차트 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-blue-600 w-5 h-5" />
              자치구별 시민 제안 수요 vs 공공 출생·보육 인프라 지표 비교 분석
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              막대 그래프(좌측 축: 시민 제안 수량)와 꺾은선 그래프(우측 축: 총 출생아 수 / 보육시설 수 <strong className="text-emerald-700">x10 확대 시각화</strong>)를 통해 지역별 정책 사각지대 및 인프라 매칭 추세를 종합 검토할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={districtChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
              <YAxis yAxisId="left" orientation="left" stroke="#2563eb" tick={{ fontSize: 11 }} label={{ value: '제안수(건)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#e11d48" tick={{ fontSize: 11 }} label={{ value: '출생아수(명) / 보육시설(x10개)', angle: 90, position: 'insideRight', fontSize: 10 }} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name.includes('보육시설')) {
                    const realVal = Math.round(Number(value) / 10);
                    return [`${realVal.toLocaleString()}개소 (x10 스케일링)`, '보육시설 수'];
                  }
                  if (name.includes('출생아')) {
                    return [`${Number(value).toLocaleString()}명`, '총 출생아 수'];
                  }
                  if (name.includes('제안')) {
                    return [`${value}건`, '시민 제안 수'];
                  }
                  return [value, name];
                }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="시민 제안수" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
              <Line yAxisId="right" type="monotone" dataKey="출생아수(명)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="보육시설수(x10개)" name="보육시설수(x10개소 확대)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 25개 자치구 퀵 필터 그리드 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-800">전체 25개 자치구 정렬 퀵 선택</p>
            <p className="text-[11px] text-slate-500">
              현재 정렬 방식: <strong className="text-indigo-600 font-extrabold">{sortOrder === 'desc' ? '시민 제안건수 많은 순 (내림차순)' : '시민 제안건수 적은 순 (오름차순)'}</strong>
            </p>
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs self-start sm:self-auto"
            title="아래 25개 자치구 칩 및 비교 차트의 정렬 순서를 내림차순/오름차순으로 전환합니다."
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>{sortOrder === 'desc' ? '건수 높은 순 (내림차순)' : '건수 낮은 순 (오름차순)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5">
          {districtData.map(item => {
            const dist = item.name;
            const count = item.count;
            const hasData = count > 0;
            const isSelected = selectedDistrict === dist;
            
            return (
              <button
                key={dist}
                onClick={() => onSelectDistrict(isSelected ? null : dist)}
                className={`text-[11px] py-1.5 px-1 rounded-lg font-bold border transition duration-150 flex flex-col items-center justify-center cursor-pointer ${
                  isSelected 
                    ? 'bg-red-500 text-white border-red-600 shadow-sm ring-2 ring-red-200' 
                    : hasData 
                      ? 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200 hover:border-indigo-400' 
                      : 'bg-slate-50/70 hover:bg-indigo-50 text-slate-500 border-slate-200/80 hover:border-indigo-300'
                }`}
                title={`${dist}: 총 ${count}건 시민 제안`}
              >
                <span>{dist}</span>
                {hasData && (
                  <span className={`text-[9px] mt-0.5 font-mono ${isSelected ? 'text-red-100 font-extrabold' : 'text-slate-500'}`}>
                    ({count}건)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 자치구의 제안 리스트 */}
      <AnimatePresence mode="wait">
        {selectedDistrict ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/85 mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="text-red-500 w-4 h-4" />
                <span>{selectedDistrict} 시민 제안 목록</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                  총 {filteredProposals.length}건
                </span>
              </h4>
              <button
                onClick={() => onSelectDistrict(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                목록 닫기
              </button>
            </div>

            <div className="space-y-4">
              {filteredProposals.length > 0 ? (
                filteredProposals.map(prop => (
                  <div 
                    key={prop.id}
                    className="p-4 rounded-lg border border-slate-100 hover:border-slate-300 transition bg-slate-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                          {prop.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{prop.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">{prop.reg_date}</span>
                        {prop.reply_yn === 'Y' ? (
                          <span className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3 h-3" /> 답변완료
                          </span>
                        ) : (
                          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                            <HelpCircle className="w-3 h-3" /> 검토중
                          </span>
                        )}
                      </div>
                    </div>

                    <h5 className="text-sm font-bold text-slate-800 mb-1.5">{prop.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">{prop.content}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">배정부서</span>
                        <div className="flex flex-wrap gap-1">
                          {prop.department.map(dept => (
                            <span key={dept} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-slate-600">
                          <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {prop.vote_score}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> 댓글 {prop.comment_cnt}
                        </span>
                        <a
                          href={prop.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${prop.id.replace('PROP-', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 transition-colors"
                          title={prop.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${prop.id.replace('PROP-', '')}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[240px]">
                            {prop.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${prop.id.replace('PROP-', '')}`}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  해당 자치구에 등록된 제안이 없습니다.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs"
          >
            위에 정렬된 막대바나 자치구 버튼을 클릭하시면 자치구별 시민 목소리를 상세히 확인할 수 있습니다.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
