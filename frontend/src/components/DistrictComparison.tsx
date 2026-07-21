/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ThumbsUp, MessageSquare, HelpCircle, CheckCircle, ArrowUpDown, ExternalLink, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ComposedChart, Line } from 'recharts';
import { PolicyProposal } from '../types';
import { SEOUL_DISTRICTS } from '../data/mockData';
import { districtStats } from '../data/mockData';
import { districtMapLayout } from '../data/seoul_districts_geo';
import { exportToCsv } from '../utils/exportCsv';
import SeoulMap from './SeoulMap';

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
  const selectedDistrictDemandIndex = selectedDistrictDetail
    ? Number((selectedDistrictDetail.count * (1 + selectedDistrictDetail.avgVote / 100)).toFixed(1))
    : 0;

  const tooltipLabelMap: Record<string, string> = {
    proposals: '제안 건수',
    births: '출생아 수',
    childcare: '보육시설 수',
    demandIndex: '정책 수요지수',
    tfr: '합계출산율',
  };

  const tooltipFormatter = (value: number | string, name: string) => [value, tooltipLabelMap[name] ?? name];

  const filteredProposals = useMemo(() => {
    if (!selectedDistrict) return [];
    return proposals.filter(p => p.district === selectedDistrict);
  }, [proposals, selectedDistrict]);

  const chartData = useMemo(() => {
    return districtData.map(item => {
      const stat = districtStats.find(stat => stat.district === item.name);
      const demandIndex = Number((item.count * (1 + item.avgVote / 100)).toFixed(1));
      return {
        name: item.name,
        proposals: item.count,
        births: stat?.births_total ?? 0,
        childcare: stat?.childcare_facility_count ?? 0,
        tfr: stat?.tfr ?? 0,
        demandIndex,
        selected: item.name === selectedDistrict,
      };
    }).sort((a, b) => b.proposals - a.proposals);
  }, [districtData, selectedDistrict]);

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
            {/* 배경 오버레이 기능 제거: 더 이상 버튼/이미지를 렌더링하지 않습니다. */}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <SeoulMap mapData={adjustedDistrictMapData} selectedDistrict={selectedDistrict} onSelectDistrict={onSelectDistrict} />
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
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span>합계출산율</span>
                    <span className="font-bold text-slate-900">{selectedDistrictStat?.tfr?.toFixed(3) ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span>정책 수요지수</span>
                    <span className="font-bold text-slate-900">{selectedDistrictDemandIndex}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  지도에서 자치구를 선택하면 제안 수, 출생아수, 보육시설수 요약이 여기에 표시됩니다.
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">자치구 제안 건수 비교</p>
              <div className="h-[240px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} height={70} interval={0} angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} formatter={tooltipFormatter} />
                    <Bar dataKey="proposals" name="제안 건수" radius={[8, 8, 0, 0]} barSize={18} onClick={(event: any) => event?.activeLabel && onSelectDistrict(event.activeLabel)}>
                      {chartData.map(item => (
                        <Cell key={item.name} fill={item.selected ? '#dc2626' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">출생아 수 · 보육시설 수 비교</p>
              <div className="h-[240px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} height={80} interval={0} angle={-35} textAnchor="end" tickMargin={10} minTickGap={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} formatter={tooltipFormatter} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                    <Bar dataKey="births" name="출생아 수" radius={[8, 8, 0, 0]} barSize={14}>
                      {chartData.map(item => (
                        <Cell key={`births-${item.name}`} fill={item.selected ? '#065f46' : '#10b981'} />
                      ))}
                    </Bar>
                    <Bar dataKey="childcare" name="보육시설 수" radius={[8, 8, 0, 0]} barSize={14}>
                      {chartData.map(item => (
                        <Cell key={`childcare-${item.name}`} fill={item.selected ? '#b45309' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">합계출산율 · 정책 수요지수</p>
              <div className="h-[260px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} height={80} interval={0} angle={-35} textAnchor="end" tickMargin={10} minTickGap={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 1]} />
                    <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} formatter={tooltipFormatter} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                    <Bar dataKey="demandIndex" name="정책 수요지수" yAxisId="left" radius={[8, 8, 0, 0]} barSize={14}>
                      {chartData.map(item => (
                        <Cell key={`demand-${item.name}`} fill={item.selected ? '#db2777' : '#8b5cf6'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="tfr" name="합계출산율" yAxisId="right" stroke="#0f766e" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
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
