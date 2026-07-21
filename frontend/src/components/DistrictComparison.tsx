/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ThumbsUp, MessageSquare, HelpCircle, CheckCircle, ArrowUpDown, ExternalLink, Download } from 'lucide-react';
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
      .filter(item => item.count > 0 || selectedDistrict === item.name)
      .sort((a, b) => (sortOrder === 'desc' ? b.count - a.count : a.count - b.count));
  }, [proposals, sortOrder, selectedDistrict]);

  const districtMapData = useMemo(() => {
    const maxCount = Math.max(...districtData.map(item => item.count), 1);

    return districtMapLayout.map(item => {
      const districtEntry = districtData.find(entry => entry.name === item.name) ?? { name: item.name, count: 0, avgVote: 0 };
      const stat = districtStats.find(entry => entry.district === item.name);
      const isSelected = selectedDistrict === item.name;
      const normalized = districtEntry.count / maxCount;
      const fill = isSelected
        ? '#ef4444'
        : districtEntry.count > 0
          ? `rgba(14, 116, 144, ${0.22 + normalized * 0.58})`
          : '#f1f5f9';

      return {
        ...item,
        count: districtEntry.count,
        avgVote: districtEntry.avgVote,
        births: stat?.births_total ?? 0,
        childcare: stat?.childcare_facility_count ?? 0,
        fill,
      };
    });
  }, [districtData, selectedDistrict]);

  // Adjust label positions to reduce simple overlaps (naive vertical shift)
  const adjustedDistrictMapData = useMemo(() => {
    const items = districtMapData.map(i => ({ ...i, labelX: (i as any).labelX ?? 0, labelY: (i as any).labelY ?? 0 }));
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    const approxCharWidth = 6; // px per character, rough
    items.forEach(item => {
      const text = item.name + (item.count > 0 ? ` ${item.count}건` : '');
      const w = Math.min(120, Math.max(40, text.length * approxCharWidth));
      const h = 14;
      let x = item.labelX - Math.floor(w / 2);
      let y = item.labelY - Math.floor(h / 2);

      // shift down until no overlap or max attempts
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const overlap = placed.some(r => {
          return !(x + w < r.x || x > r.x + r.w || y + h < r.y || y > r.y + r.h);
        });
        if (!overlap) break;
        y += h + 2;
        attempts += 1;
      }
      placed.push({ x, y, w, h });
      item._labelX = x + Math.floor(w / 2);
      item._labelY = y + Math.floor(h / 2);
    });
    return items;
  }, [districtMapData]);

  const selectedDistrictDetail = districtData.find(item => item.name === selectedDistrict);
  const selectedDistrictStat = districtStats.find(stat => stat.district === selectedDistrict);

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
              서울시 자치구 지도에서 제안 분포를 바로 확인하세요
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              지도를 클릭하면 해당 자치구의 시민제안 건수와 공공데이터 기반 통계를 바로 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 font-bold flex items-center gap-1 transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'desc' ? '건수 높은 순' : '건수 낮은 순'}
            </button>
            <button
              onClick={handleExportDistrictStats}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
              title="25개 자치구별 출생 및 보육 통계 CSV 다운로드"
            >
              <Download className="w-3.5 h-3.5" /> 통계 CSV
            </button>
            {/* 배경 오버레이 기능 제거: 더 이상 버튼으로 배경을 토글하지 않습니다. */}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <svg viewBox="0 0 560 380" className="w-full h-[340px]">
              <rect x="12" y="12" width="536" height="356" rx="24" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <text x="28" y="38" fontSize="13" fontWeight="700" fill="#0f172a">서울 자치구 제안 분포 지도</text>
              <text x="28" y="56" fontSize="11" fill="#64748b">색이 진할수록 제안 건수가 많습니다.</text>

              <path
                d="M 104 88 L 176 72 L 230 78 L 286 100 L 332 90 L 404 96 L 456 116 L 492 150 L 488 214 L 446 250 L 392 272 L 336 284 L 286 268 L 232 258 L 176 248 L 126 224 L 98 184 L 104 138 Z"
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="2"
                opacity="0.95"
              />
              <path
                d="M 122 118 L 176 112 L 206 136 L 196 168 L 144 176 L 118 148 Z"
                fill="#eef2ff"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                opacity="0.8"
              />
              <path
                d="M 318 112 L 376 108 L 410 132 L 396 166 L 338 170 L 314 140 Z"
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                opacity="0.8"
              />
              {/* 배경 오버레이 제거: 이미지는 더 이상 렌더링되지 않습니다. */}
              {adjustedDistrictMapData.map(item => (
                <g
                  key={item.name}
                  onClick={() => onSelectDistrict(item.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectDistrict(item.name);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer outline-none"
                >
                  <path
                    d={item.d}
                    fill={item.fill}
                    stroke={selectedDistrict === item.name ? '#dc2626' : '#64748b'}
                    strokeWidth={selectedDistrict === item.name ? 3 : 1.2}
                  />
                  <text x={item._labelX ?? item.labelX} y={item._labelY ?? item.labelY} fontSize="10" fontWeight="700" fill="#0f172a">
                    {item.name}
                  </text>
                  <text x={item._labelX ?? item.labelX} y={(item._labelY ?? item.labelY) + 14} fontSize="9" fill={item.count > 0 ? '#0f766e' : '#64748b'}>
                    {item.count > 0 ? `${item.count}건` : '데이터 없음'}
                  </text>
                </g>
              ))}
            </svg>
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
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">빠른 선택</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {districtMapData.filter(item => item.count > 0).slice(0, 8).map(item => (
                  <button
                    key={item.name}
                    onClick={() => onSelectDistrict(item.name)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${selectedDistrict === item.name ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-400 italic font-semibold">
          * 지도 구역을 클릭하면 해당 자치구의 시민 제안 목록이 바로 아래에 표시됩니다. 색이 진할수록 제안 건수가 많습니다.
        </p>
      </div>

      {/* 25개 자치구 퀵 필터 그리드 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-xs font-bold text-slate-700 mb-2.5">전체 자치구 퀵 선택</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5">
          {SEOUL_DISTRICTS.map(dist => {
            const hasData = proposals.some(p => p.district === dist);
            const count = proposals.filter(p => p.district === dist).length;
            const isSelected = selectedDistrict === dist;
            
            return (
              <button
                key={dist}
                onClick={() => onSelectDistrict(isSelected ? null : dist)}
                className={`text-[11px] py-1.5 px-1 rounded-lg font-bold border transition duration-150 flex flex-col items-center justify-center ${
                  isSelected 
                    ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                    : hasData 
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-[#0A2351]' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
                disabled={!hasData}
              >
                <span>{dist}</span>
                {hasData && (
                  <span className={`text-[9px] mt-0.5 font-mono ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
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
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{prop.content}</p>

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
