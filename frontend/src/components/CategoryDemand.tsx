/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { PolicyCategory, PolicyProposal } from '../types';
import { KeywordDetailModal } from './KeywordDetailModal';

function cleanKoreanWord(word: string): string {
  const suffixes = [
    '에서', '에게', '한테', '부터', '까지', '으로', '하고', '보다', '들만',
    '들', '은', '는', '이', '가', '을', '를', '에', '의', '과', '와', '도', '만', '로'
  ];
  
  let cleaned = word;
  let changed = true;
  
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (cleaned.length > suffix.length && cleaned.endsWith(suffix)) {
        cleaned = cleaned.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
  }
  return cleaned;
}

export interface RichKeywordItem {
  keyword: string;
  count: number;         // 텍스트 총 등장 빈도수 (TF)
  docCount: number;      // 실제 포함된 제안 건수 (DF)
  tfidfScore: number;    // TF-IDF 중요도 점수 (0.00 ~ 0.99)
  topDept: string;       // 주 연관 담당 부서
  topCategory: string;   // 주 연관 1차 대분류
  topSubCategory: string;   // 주 연관 중분류
  topMicroCategory: string; // 주 연관 소분류
}

function extractRichTopKeywords(proposals: PolicyProposal[], count: number = 30): RichKeywordItem[] {
  const keywordTfMap: Record<string, number> = {};
  const keywordDocMap: Record<string, Set<string>> = {};
  const keywordDeptMap: Record<string, Record<string, number>> = {};
  const keywordCatMap: Record<string, Record<string, number>> = {};
  const keywordSubCatMap: Record<string, Record<string, number>> = {};
  const keywordMicroCatMap: Record<string, Record<string, number>> = {};

  const stopWords = new Set([
    '서울시', '서울', '지원', '관한', '위한', '대해', '관하여', '합니다', 
    '해주세요', '부탁드립니다', '제안합니다', '생각합니다', '경우', '관련',
    '있는', '있습니다', '제안', '대한', '하는', '있도록', '위해', 
    '많이', '좋겠습니다', '현재', '많은', '너무', '같습니다', '하고', 
    '안녕하세요', '갈습니다', '없습니다', '때문에', '통해', '아래', 
    '또한', '있게', '혜택을', '주세요', '저는', '것입니다', '그리고', 
    '다른', '서울시에서', '같은', '그래서', '것이', '것을', '해서', '하며',
    '아니라', '필요합니다', '있고', '하지만', '있으며', '같아', '같네요',
    '바랍니다', '원합니다', '등', '및', '및 관련'
  ]);

  const totalDocs = proposals.length || 1;

  proposals.forEach(p => {
    const text = (p.title + ' ' + (p.content || '')).replace(/[^가-힣a-zA-Z0-9\s]/g, ' ');
    const words = text.split(/\s+/);
    const seenInDoc = new Set<string>();

    words.forEach(w => {
      if (w.length >= 2) {
        const cleaned = cleanKoreanWord(w);
        if (cleaned.length >= 2 && !stopWords.has(cleaned)) {
          // TF
          keywordTfMap[cleaned] = (keywordTfMap[cleaned] || 0) + 1;
          
          // DF (문서 집합)
          if (!keywordDocMap[cleaned]) keywordDocMap[cleaned] = new Set();
          keywordDocMap[cleaned].add(p.id);

          // Dept & Cat mapping
          if (!keywordDeptMap[cleaned]) keywordDeptMap[cleaned] = {};
          const dept = (p.department && p.department[0]) || '저출생사업1팀';
          keywordDeptMap[cleaned][dept] = (keywordDeptMap[cleaned][dept] || 0) + 1;

          if (!keywordCatMap[cleaned]) keywordCatMap[cleaned] = {};
          const cat = p.category || '기타';
          keywordCatMap[cleaned][cat] = (keywordCatMap[cleaned][cat] || 0) + 1;

          if (!keywordSubCatMap[cleaned]) keywordSubCatMap[cleaned] = {};
          const subCat = p.sub_category || '';
          if (subCat) keywordSubCatMap[cleaned][subCat] = (keywordSubCatMap[cleaned][subCat] || 0) + 1;

          if (!keywordMicroCatMap[cleaned]) keywordMicroCatMap[cleaned] = {};
          const microCat = p.micro_category || '';
          if (microCat) keywordMicroCatMap[cleaned][microCat] = (keywordMicroCatMap[cleaned][microCat] || 0) + 1;
        }
      }
    });
  });

  const rawResults = Object.keys(keywordTfMap).map(kw => {
    const tf = keywordTfMap[kw];
    const df = keywordDocMap[kw] ? keywordDocMap[kw].size : 1;
    
    // IDF = log(Total / DF)
    const idf = Math.log((totalDocs + 1) / (df + 1));
    const rawTfidf = tf * idf;

    // 주 연관 부서
    const depts = keywordDeptMap[kw] || {};
    const topDept = Object.entries(depts).sort((a, b) => b[1] - a[1])[0]?.[0] || '건강임신지원팀';

    // 주 연관 카테고리
    const cats = keywordCatMap[kw] || {};
    const topCategory = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '보육·돌봄 인프라';

    const subCats = keywordSubCatMap[kw] || {};
    const topSubCategory = Object.entries(subCats).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const microCats = keywordMicroCatMap[kw] || {};
    const topMicroCategory = Object.entries(microCats).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return {
      keyword: kw,
      count: tf,
      docCount: df,
      rawTfidf,
      topDept,
      topCategory,
      topSubCategory,
      topMicroCategory
    };
  });

  // TF-IDF Normalization (0.00 ~ 0.99 점수 변환)
  const maxRawTfidf = Math.max(...rawResults.map(r => r.rawTfidf), 1);

  return rawResults
    .map(r => ({
      keyword: r.keyword,
      count: r.count,
      docCount: r.docCount,
      tfidfScore: parseFloat((r.rawTfidf / maxRawTfidf).toFixed(3)),
      topDept: r.topDept,
      topCategory: r.topCategory,
      topSubCategory: r.topSubCategory,
      topMicroCategory: r.topMicroCategory
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
}
import { MultiTierCategoryFilter, FilterState, CAT1_TO_LIFECYCLE } from './MultiTierCategoryFilter';
import { 
  BarChart3, 
  ThumbsUp, 
  Eye, 
  ChevronRight, 
  FileText, 
  Calendar, 
  Building2, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Tag,
  Download
} from 'lucide-react';

interface Props {
  proposals: PolicyProposal[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryDemand: React.FC<Props> = ({
  proposals,
  selectedCategory,
  onSelectCategory
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedKeywordModal, setSelectedKeywordModal] = useState<string | null>(null);
  const [selectedKeywordYear, setSelectedKeywordYear] = useState<string>('전체');
  const [selectedTagKeyword, setSelectedTagKeyword] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    year: '전체년',
    lifecycle: '전체',
    category1: '전체',
    category2: '전체',
    category3: '전체',
    department: '전체',
  });

  // Sync selectedCategory from parent component with multi-tier filter state
  React.useEffect(() => {
    if (selectedCategory && selectedCategory !== '전체') {
      const targetLifecycle = CAT1_TO_LIFECYCLE[selectedCategory] || '전체';
      setFilterState(prev => ({
        ...prev,
        category1: selectedCategory,
        lifecycle: targetLifecycle,
        category2: '전체',
        category3: '전체'
      }));
    } else if (selectedCategory === null) {
      setFilterState(prev => ({
        ...prev,
        category1: '전체',
        lifecycle: '전체',
        category2: '전체',
        category3: '전체'
      }));
    }
  }, [selectedCategory]);

  const handleFilterChange = (newState: FilterState) => {
    setFilterState(newState);
    if (newState.category1 === '전체') {
      onSelectCategory(null);
    } else {
      onSelectCategory(newState.category1);
    }
  };

  // 1. 연도 필터링된 제안 목록 (TOP 30 추출용)
  const keywordFilteredProposals = useMemo(() => {
    if (selectedKeywordYear === '전체') return proposals;
    if (selectedKeywordYear === '2026') return proposals.filter(p => p.reg_date?.startsWith('2026'));
    if (selectedKeywordYear === '2025') return proposals.filter(p => p.reg_date?.startsWith('2025'));
    if (selectedKeywordYear === '2024') return proposals.filter(p => p.reg_date?.startsWith('2024'));
    if (selectedKeywordYear === '2023') return proposals.filter(p => p.reg_date?.startsWith('2023'));
    if (selectedKeywordYear === '2022이전') return proposals.filter(p => p.reg_date && p.reg_date < '2023');
    return proposals;
  }, [proposals, selectedKeywordYear]);

  const topKeywords30 = useMemo(() => extractRichTopKeywords(keywordFilteredProposals, 30), [keywordFilteredProposals]);

  // 현재 선택된 키워드 객체 룩업
  const selectedTagItem = useMemo(() => {
    if (!selectedTagKeyword) return null;
    return topKeywords30.find(k => k.keyword === selectedTagKeyword) || null;
  }, [selectedTagKeyword, topKeywords30]);

  // 2. [실시간 연동] 연도 + 키워드 태그 + 5단계 딥필터바가 100% 매칭된 필터링 제안 목록
  const activeKeywordProposals = useMemo(() => {
    return proposals.filter(p => {
      // 1) 키워드 전용 연도 필터
      if (selectedKeywordYear !== '전체') {
        if (selectedKeywordYear === '2026' && !p.reg_date?.startsWith('2026')) return false;
        if (selectedKeywordYear === '2025' && !p.reg_date?.startsWith('2025')) return false;
        if (selectedKeywordYear === '2024' && !p.reg_date?.startsWith('2024')) return false;
        if (selectedKeywordYear === '2023' && !p.reg_date?.startsWith('2023')) return false;
        if (selectedKeywordYear === '2022이전' && (!p.reg_date || p.reg_date >= '2023')) return false;
      }
      // 2) 선택된 키워드 태그 필터 (제목 또는 본문에 해당 키워드 포함 여부)
      if (selectedTagKeyword && !p.title.includes(selectedTagKeyword) && !p.content.includes(selectedTagKeyword)) {
        return false;
      }
      // 3) 차트에서 클릭한 1차 대분류 필터
      if (selectedCategory && p.category !== selectedCategory) return false;

      // 4) 5단계 딥 필터바 연동 (제안연도·생애주기·1차대분류·2차중분류·3차세분류·담당부서)
      if (filterState.year !== '전체년') {
        if (filterState.year === '2026' && !p.reg_date?.startsWith('2026')) return false;
        if (filterState.year === '2025' && !p.reg_date?.startsWith('2025')) return false;
        if (filterState.year === '2024' && !p.reg_date?.startsWith('2024')) return false;
        if (filterState.year === '2023' && !p.reg_date?.startsWith('2023')) return false;
        if (filterState.year === '2022이전' && (!p.reg_date || p.reg_date >= '2023')) return false;
      }
      if (filterState.lifecycle !== '전체' && p.policy_flow !== filterState.lifecycle) return false;
      if (filterState.category1 !== '전체' && p.category !== filterState.category1) return false;
      if (filterState.category2 !== '전체' && p.sub_category !== filterState.category2) return false;
      if (filterState.category3 !== '전체' && p.micro_category !== filterState.category3) return false;
      if (filterState.department !== '전체' && (!p.department || !p.department.includes(filterState.department))) return false;

      return true;
    });
  }, [proposals, selectedKeywordYear, selectedTagKeyword, selectedCategory, filterState]);

  // 3. [실시간 연동] 카테고리별 통계 데이터 가공
  const categoryChartData = useMemo(() => {
    const stats: Record<string, { count: number; totalVote: number }> = {};

    activeKeywordProposals.forEach(p => {
      const cat = p.category || '기타';
      if (!stats[cat]) {
        stats[cat] = { count: 0, totalVote: 0 };
      }
      stats[cat].count += 1;
      stats[cat].totalVote += p.vote_score;
    });

    return Object.entries(stats).map(([name, val]) => ({
      name,
      count: val.count,
      avgVote: val.count > 0 ? Math.round(val.totalVote / val.count) : 0
    })).sort((a, b) => b.count - a.count);
  }, [activeKeywordProposals]);

  // 4. [실시간 연동] 필터링된 제안 기준 공감수 최고순 TOP 5 제안
  const topVotedProposals = useMemo(() => {
    return [...activeKeywordProposals]
      .sort((a, b) => b.vote_score - a.vote_score)
      .slice(0, 5);
  }, [activeKeywordProposals]);

  // 현재 상세히 보기 위한 제안 정보
  const activeProposal = useMemo(() => {
    const idToFind = selectedProposalId || topVotedProposals[0]?.id;
    return activeKeywordProposals.find(p => p.id === idToFind) || topVotedProposals[0] || proposals[0];
  }, [proposals, activeKeywordProposals, selectedProposalId, topVotedProposals]);

  // 필터 조건 변경 시 이전 선택 제안 ID 리셋 -> 새 필터의 TOP 1 제안 자동 세팅
  useEffect(() => {
    setSelectedProposalId(null);
  }, [selectedKeywordYear, selectedTagKeyword, selectedCategory, filterState]);

  return (
    <div className="space-y-3.5">
      {/* 🏷️ [상단 1] 연도별 핵심 정책 키워드 탐색기 (TOP 30 대형 뷰 / 엑셀 자동 필터 스타일) */}
      <div className="bg-gradient-to-r from-slate-900 to-[#0A2351] text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Tag className="w-4.5 h-4.5 text-yellow-400" />
            <h3 className="text-sm sm:text-base font-black">
              연도별 핵심 정책 키워드 탐색기 (TOP 30)
              {selectedTagKeyword && (
                <span className="ml-2 text-xs font-bold bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full animate-pulse">
                  #{selectedTagKeyword} 선택됨
                </span>
              )}
            </h3>
          </div>
          {/* 연도 선택 필터 칩 */}
          <div className="flex flex-wrap items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
            <span className="text-[10px] font-bold text-slate-300 pl-1 pr-0.5">📅 연도:</span>
            {['전체', '2026', '2025', '2024', '2023', '2022이전'].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedKeywordYear(y)}
                className={`text-[11px] px-2 py-0.5 rounded-lg font-extrabold transition cursor-pointer ${
                  selectedKeywordYear === y
                    ? y === '2026' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-yellow-400 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {y === '2026' ? '🔥 2026 최신' : y === '2022이전' ? '2022이전' : `${y}년`}
              </button>
            ))}
          </div>
        </div>

        {/* 📊 [선택된 키워드 정밀 분석 메트릭스 네모 카드] */}
        {selectedTagItem && (
          <div className="bg-slate-950/80 border border-yellow-400/50 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-black text-sm">#{selectedTagItem.keyword}</span>
              <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded font-black text-[10px]">정밀 분석 중</span>
              <button 
                onClick={() => setSelectedTagKeyword(null)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                [선택 해제]
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-bold">
              <span className="text-slate-300">📌 실제 포함 제안수: <b className="text-white font-mono">{selectedTagItem.docCount}건</b></span>
              <span className="text-slate-300">🔤 텍스트 총 빈도(TF): <b className="text-yellow-300 font-mono">{selectedTagItem.count}회</b></span>
              <span className="text-slate-300">📊 TF-IDF 중요도: <b className="text-emerald-400 font-mono">{selectedTagItem.tfidfScore}</b></span>
              <span className="text-slate-300">🏢 주 연관 부서: <b className="text-indigo-300 font-mono">{selectedTagItem.topDept}</b></span>
            </div>
          </div>
        )}

        {/* CSV 다운로드 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400 font-bold">총 {topKeywords30.length}개 키워드 · {selectedKeywordYear} 기준</span>
          <button
            onClick={() => {
              const bom = '﻿';
              const header = '순위,키워드,텍스트빈도(TF),포함제안수(DF),TF-IDF,주연관부서,대분류,중분류,소분류\n';
              const rows = topKeywords30.map((k, i) =>
                `${i + 1},"${k.keyword}",${k.count},${k.docCount},${k.tfidfScore},"${k.topDept}","${k.topCategory}","${k.topSubCategory}","${k.topMicroCategory}"`
              ).join('\n');
              const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `키워드_TOP30_${selectedKeywordYear}_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            CSV 다운로드
          </button>
        </div>

        {/* 🏷️ TOP 30 키워드 태그 클라우드 */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {topKeywords30.map((item, idx) => {
            const isTagSelected = selectedTagKeyword === item.keyword;
            return (
              <button
                key={item.keyword}
                type="button"
                onClick={() => {
                  if (isTagSelected) {
                    setSelectedTagKeyword(null);
                  } else {
                    setSelectedTagKeyword(item.keyword);
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-full font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isTagSelected
                    ? 'bg-yellow-400 text-slate-950 border-yellow-300 ring-2 ring-yellow-300 shadow-md scale-105 font-black'
                    : idx < 5
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-2xs hover:scale-105'
                    : idx < 15
                    ? 'bg-blue-600/80 hover:bg-blue-600 text-white border-blue-400 hover:scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/20 hover:scale-105'
                }`}
                title={`[#${item.keyword} 정밀 메트릭스]\n• 실제 포함 제안수: ${item.docCount}건\n• 텍스트 총 빈도(TF): ${item.count}회\n• TF-IDF 중요도 점수: ${item.tfidfScore}\n• 주 연관 부서: ${item.topDept}\n\n* 클릭 시 하단 차트 및 TOP 5 제안이 실시간으로 필터링 연동됩니다.`}
              >
                <span>#{item.keyword}</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono ${
                  isTagSelected ? 'bg-slate-900 text-yellow-300' : 'bg-black/30 text-white'
                }`}>
                  {item.count}회
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── [구분선 1] 키워드 탐색기 <-> 딥 필터바 ── */}
      <div className="relative py-0.5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200/80" />
        </div>
      </div>

      <hr className="border-slate-200/60" />

      {/* 🔻 [상단 2] 5단계 다차원 분류체계 딥 필터링 (제안연도·생애주기·1차대분류·2차중분류·3차세분류·담당부서) */}
      <MultiTierCategoryFilter
        proposals={proposals}
        filterState={filterState}
        onFilterChange={handleFilterChange}
      />

      {/* ── [구분선 2] 상단 필터존 <-> 하단 가로 2열 분석존 ── */}
      <div className="relative py-0.5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200/80" />
        </div>
      </div>

      {/* 📍 [하단 가로 2열 50:50 세션] 좌: 2축 분석 차트 / 우: TOP 5 제안 & 원문 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* 📊 [하단 좌측 6열] 2축 복합 분석 그래프 */}
        <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 pb-2.5 border-b border-slate-100 gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="text-indigo-600 w-4 h-4" />
                  정책 분야별 수요 강도 복합 분석
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  막대(제안수)는 민원의 양을, 선(평균 공감도)은 체감 수요 강도를 의미합니다.
                </p>
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className="text-[11px] text-[#0A2351] font-bold hover:underline shrink-0"
                >
                  전체 보기
                </button>
              )}
            </div>

            <div className="h-[260px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={categoryChartData} margin={{ top: 10, right: -10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis yAxisId="left" label={{ value: '제안수', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fill: '#0A2351', fontWeight: 'bold' } }} tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: '공감도', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 9, fill: '#f59e0b', fontWeight: 'bold' } }} tick={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value, name) => [
                      name === 'count' ? `${value}건` : `${value}표`,
                      name === 'count' ? '제안 건수' : '평균 공감도'
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="count" name="count" fill="#0A2351" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => {
                    if (state && state.activeLabel) onSelectCategory(state.activeLabel as string);
                  }} />
                  <Line yAxisId="right" type="monotone" dataKey="avgVote" name="avgVote" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-2 pt-2 border-t border-slate-100 text-[10.5px]">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-3.5 h-2.5 bg-[#0A2351] rounded-xs" />
              <span className="text-slate-600">제안 건수 (좌측 축)</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-3.5 h-0.5 bg-amber-500 relative block"><span className="absolute -top-1 left-0.5 w-2 h-2 rounded-full bg-amber-500" /></span>
              <span className="text-slate-600">평균 공감수 (우측 축)</span>
            </div>
          </div>
        </div>

        {/* 📋 [하단 우측 6열] 키워드 연관 공감도 TOP 5 제안 & 원문 미리보기 */}
        <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ThumbsUp className="text-[#0A2351] w-4 h-4" />
                시민 공감도 Top 5 제안 {selectedTagKeyword && <span className="text-indigo-600 font-extrabold text-[10.5px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">#{selectedTagKeyword} 연관</span>}
              </h4>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                실시간 연동
              </span>
            </div>

            <div className="space-y-2">
              {topVotedProposals.map((prop, idx) => {
                const isActive = activeProposal?.id === prop.id;
                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProposalId(prop.id)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-2.5 ${
                      isActive 
                        ? 'bg-[#0a2351]/5 border-[#0A2351] ring-1 ring-[#0A2351]/20' 
                        : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-800' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[11.5px] font-bold text-slate-800 line-clamp-1">{prop.title}</h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[9.5px] text-slate-500 font-bold">
                        <span>{prop.district}</span>
                        <span>•</span>
                        <span className="text-[#0A2351]">{prop.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-700 font-mono flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        <ThumbsUp className="w-2.5 h-2.5 text-blue-500" />
                        {prop.vote_score}표
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <KeywordDetailModal
        isOpen={!!selectedKeywordModal}
        keyword={selectedKeywordModal}
        proposals={proposals}
        onClose={() => setSelectedKeywordModal(null)}
      />
    </div>
  );
};
