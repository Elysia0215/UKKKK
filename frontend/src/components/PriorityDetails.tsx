/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PolicyProposal, PolicyCategory, DepartmentName } from '../types';
import { SEOUL_DISTRICTS } from '../data/mockData';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Building2, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  FileSpreadsheet,
  ExternalLink,
  Download
} from 'lucide-react';
import { CivilRequestModal } from './CivilRequestModal';
import { exportToCsv } from '../utils/exportCsv';

interface Props {
  proposals: PolicyProposal[];
}

interface ProposalGroup {
  id: string;
  category: PolicyCategory;
  keyword: string;
  name: string;
  items: PolicyProposal[];
  unansweredCount: number;
  totalVotes: number;
}

export const PriorityDetails: React.FC<Props> = ({ proposals }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedDept, setSelectedDept] = useState<string>('전체');
  const [onlyShowGaps, setOnlyShowGaps] = useState(false); // '정책 공백(미답변+고공감)'만 보기 토글
  const [viewMode, setViewMode] = useState<'list' | 'group'>('group'); // 그룹 보기 vs 개별 리스트 보기
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [civilModalOpen, setCivilModalOpen] = useState(false);
  const [civilCategory, setCivilCategory] = useState('전체');

  // 1. 유사 제안 그룹핑 로직 (같은 카테고리 + 비슷한 키워드 핵심 단어 매칭)
  const groupedProposals = useMemo(() => {
    const groups: ProposalGroup[] = [];
    
    // 키워드 규칙 정의
    const keywordRules = [
      { name: '산후조리원 및 보육시설 확충 현안', keywords: ['산후조리원', '공공산후조리원'], category: '출산' as PolicyCategory },
      { name: '다자녀 카드 및 주거 혜택 기준 일원화', keywords: ['다자녀', '2자녀', '3자녀', '특별 공급'], category: '다자녀' as PolicyCategory },
      { name: '영유아 야간/주말 응급 의료 및 소아과 확보', keywords: ['응급실', '소아과', '진료', '병원'], category: '보육' as PolicyCategory },
      { name: '베이비 박스 및 위기 산모 익명 보호 긴급 지원', keywords: ['쉼터', '미혼모', '위기', '익명', '베이비 박스'], category: '위기임산부' as PolicyCategory },
      { name: '영유아 물품 대여 서비스 및 키즈카페 자치구 편차 해소', keywords: ['유모차', '대여', '키즈카페', '예약'], category: '보육' as PolicyCategory },
      { name: '다문화 가정 언어 장벽 및 보육 알림톡 개선', keywords: ['다문화', '한국어', '모국어', '알림톡', '예방접종'], category: '다문화' as PolicyCategory },
      { name: '임산부 교통비 및 청소 대행 바우처 사용처 개선', keywords: ['바우처', '교통비', '가사', '조리원비', '출산축하금'], category: '임신' as PolicyCategory },
    ];

    // 복사본 생성 후 사용
    let remainingProposals = [...proposals];

    // 규칙 기반 매칭 수행
    keywordRules.forEach((rule, idx) => {
      const matched: PolicyProposal[] = [];
      const unmatched: PolicyProposal[] = [];

      remainingProposals.forEach(p => {
        const matchesCategory = p.category === rule.category;
        const matchesKeyword = rule.keywords.some(k => 
          p.title.includes(k) || p.content.includes(k)
        );

        if (matchesCategory && matchesKeyword) {
          matched.push(p);
        } else {
          unmatched.push(p);
        }
      });

      if (matched.length > 0) {
        const totalVotes = matched.reduce((acc, curr) => acc + curr.vote_score, 0);
        const unansweredCount = matched.filter(p => p.reply_yn === 'N').length;
        
        groups.push({
          id: `GROUP-${idx + 1}`,
          category: rule.category,
          keyword: rule.keywords[0],
          name: rule.name,
          items: matched,
          unansweredCount,
          totalVotes
        });
        remainingProposals = unmatched;
      }
    });

    // 매칭되지 않고 남은 단일 제안들도 자투리 그룹으로 묶거나 개별 구성
    remainingProposals.forEach((p, idx) => {
      groups.push({
        id: `GROUP-SINGLE-${p.id}`,
        category: p.category,
        keyword: '기타',
        name: `[단독 제안] ${p.title}`,
        items: [p],
        unansweredCount: p.reply_yn === 'N' ? 1 : 0,
        totalVotes: p.vote_score
      });
    });

    // 정렬: 미답변 수 많고, 총 공감수 높은 순
    return groups.sort((a, b) => {
      if (b.unansweredCount !== a.unansweredCount) {
        return b.unansweredCount - a.unansweredCount;
      }
      return b.totalVotes - a.totalVotes;
    });
  }, [proposals]);

  // 2. 검색 및 필터 적용 (그룹 단위 또는 리스트 단위 모두 대응 가능)
  // 개별 리스트 보기 필터 결과
  const filteredListProposals = useMemo(() => {
    return proposals.filter(p => {
      // 1) 검색어 필터
      const matchesSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm);
      // 2) 분야 필터
      const matchesCategory = selectedCategory === '전체' || p.category === selectedCategory;
      // 3) 부서 필터
      const matchesDept = selectedDept === '전체' || p.department.includes(selectedDept as DepartmentName);
      // 4) 정책 공백 토글 (미답변 N 이면서 공감수 150 이상)
      const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);

      return matchesSearch && matchesCategory && matchesDept && matchesGap;
    }).sort((a, b) => b.vote_score - a.vote_score); // 기본 공감도순 정렬
  }, [proposals, searchTerm, selectedCategory, selectedDept, onlyShowGaps]);

  // 그룹 보기 필터 결과 (그룹 구성원 필터 후 빈 그룹 배제)
  const filteredGroupedProposals = useMemo(() => {
    return groupedProposals.map(g => {
      const filteredItems = g.items.filter(p => {
        const matchesSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm);
        const matchesCategory = selectedCategory === '전체' || p.category === selectedCategory;
        const matchesDept = selectedDept === '전체' || p.department.includes(selectedDept as DepartmentName);
        const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);
        return matchesSearch && matchesCategory && matchesDept && matchesGap;
      });

      if (filteredItems.length === 0) return null;

      const totalVotes = filteredItems.reduce((acc, curr) => acc + curr.vote_score, 0);
      const unansweredCount = filteredItems.filter(p => p.reply_yn === 'N').length;

      return {
        ...g,
        items: filteredItems,
        totalVotes,
        unansweredCount
      };
    }).filter((g): g is ProposalGroup => g !== null);
  }, [groupedProposals, searchTerm, selectedCategory, selectedDept, onlyShowGaps]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const categories: string[] = ['전체', '임신', '출산', '보육', '다자녀', '위기임산부', '다문화'];
  const departments: string[] = [
    '전체',
    '저출생사업1팀',
    '건강임신지원팀',
    '가족건강팀',
    '돌봄사업팀',
    '가족지원팀',
    '아동보호팀',
    '다문화지원팀'
  ];

  const handleExportProposals = () => {
    const listToExport = filteredProposals.length > 0 ? filteredProposals : proposals;
    const exportData = listToExport.map(p => ({
      '제안ID': p.id,
      '카테고리': p.category,
      '제안제목': p.title,
      '제안본문내용': p.content,
      '등록일자': p.reg_date,
      '공감수': p.vote_score,
      '댓글수': p.comment_cnt,
      '답변여부': p.reply_yn === 'Y' ? '답변완료' : '미답변',
      '자치구': p.district,
      '담당부서': Array.isArray(p.department) ? p.department.join('; ') : p.department,
      '원문URL': p.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${p.id.replace('PROP-', '')}`,
      '연동 권익위 민원수': p.related_civil_requests || 0
    }));

    exportToCsv(`서울시_출산정책_제안데이터_426건_${new Date().toISOString().split('T')[0]}.csv`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* 고정밀 필터 제어판 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="제목, 본문 키워드로 빠른 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2351]/20 focus:border-[#0A2351] transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 데이터 내보내기 버튼 */}
            <button
              onClick={handleExportProposals}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
              title="현재 필터링된 제안 데이터 (426건) 엑셀/CSV로 다운로드"
            >
              <Download className="w-3.5 h-3.5" /> 426건 데이터 엑셀/CSV 다운로드
            </button>
            {/* 정책 공백 핫필터 */}
            <button
              onClick={() => setOnlyShowGaps(!onlyShowGaps)}
              className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition ${
                onlyShowGaps 
                  ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200/50 shadow-2xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${onlyShowGaps ? 'text-rose-600' : 'text-slate-400'}`} />
              정책 공백만 선별 (공감 150표 이상 + 미답변)
            </button>

            {/* 보기 모드 변경 */}
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
              <button
                onClick={() => setViewMode('group')}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition ${
                  viewMode === 'group' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                유사 제안 그룹화
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                개별 리스트
              </button>
            </div>
          </div>
        </div>

        {/* 상세 선택 드롭다운 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-16 flex-shrink-0">정책분류</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition font-bold ${
                    selectedCategory === cat 
                      ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-16 flex-shrink-0">담당부서</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A2351]/50 font-semibold"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 실시간 필터 현황 요약 */}
      <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3 px-4 rounded-xl">
        <div className="text-xs text-blue-800 font-bold">
          {viewMode === 'group' ? (
            <span>필터 조건에 부합하는 <strong>{filteredGroupedProposals.length}개 유사 정책 군집(그룹)</strong>이 발견되었습니다.</span>
          ) : (
            <span>필터 조건에 부합하는 <strong>{filteredListProposals.length}건의 개별 제안</strong>이 발견되었습니다.</span>
          )}
        </div>
        {onlyShowGaps && (
          <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> 정책 공백 선별 모드 활성화 중
          </span>
        )}
      </div>

      {/* 콘텐츠 표시 영역 */}
      <div className="space-y-4">
        {viewMode === 'group' ? (
          /* 1. 유사 제안 그룹화 카드 뷰 */
          filteredGroupedProposals.length > 0 ? (
            filteredGroupedProposals.map((group) => {
              const isExpanded = !!expandedGroups[group.id];
              const isSingle = group.id.startsWith('GROUP-SINGLE-');
              const hasGaps = group.unansweredCount > 0;
              
              return (
                <motion.div
                  key={group.id}
                  layout
                  className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all duration-200 ${
                    hasGaps && !isSingle 
                      ? 'border-rose-200 ring-1 ring-rose-50/50' 
                      : 'border-slate-200'
                  }`}
                >
                  {/* 그룹 마스터 바 */}
                  <div 
                    onClick={() => toggleGroup(group.id)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition ${
                      hasGaps && !isSingle ? 'bg-rose-50/20 hover:bg-rose-50/50' : 'bg-slate-50/50 hover:bg-slate-100/30'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        group.category === '출산' ? 'bg-pink-100 text-pink-700' :
                        group.category === '보육' ? 'bg-indigo-100 text-indigo-700' :
                        group.category === '다자녀' ? 'bg-purple-100 text-purple-700' :
                        group.category === '위기임산부' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        group.category === '다문화' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {group.category}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {group.name}
                          {!isSingle && (
                            <span className="text-xs text-slate-500 font-normal font-mono">
                              ({group.items.length}건 묶음)
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end flex-shrink-0">
                      {group.unansweredCount > 0 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded">
                          미답변 공백 {group.unansweredCount}건
                        </span>
                      )}
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-slate-400">누적 공감수</span>
                        <p className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1 justify-end">
                          <ThumbsUp className="w-3 h-3 text-blue-500" />
                          {group.totalVotes}
                        </p>
                      </div>
                      <div>
                        {isExpanded ? (
                          <ChevronUp className="w-4.5 h-4.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4.5 h-4.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 세부 리스트 (아코디언 확장 시) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-white"
                      >
                        <div className="p-4 space-y-4">
                          {group.items.map((item) => {
                            const isGap = item.reply_yn === 'N' && item.vote_score >= 150;
                            return (
                              <div
                                key={item.id}
                                className={`p-4 rounded-lg border transition ${
                                  isGap 
                                    ? 'bg-rose-50/50 border-rose-200 shadow-sm' 
                                    : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                                    <span className="text-xs text-slate-500 font-semibold">{item.district}</span>
                                    {isGap && (
                                      <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-200 font-extrabold px-1.5 py-0.2 rounded-sm flex items-center gap-0.5 animate-pulse">
                                        <AlertTriangle className="w-2.5 h-2.5" /> 긴급 정책 공백
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 font-mono">{item.reg_date}</span>
                                    {item.reply_yn === 'Y' ? (
                                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                        <CheckCircle className="w-3 h-3" /> 답변완료
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                        <HelpCircle className="w-3 h-3" /> 미답변 검토중
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <h5 className="text-sm font-bold text-slate-800 mb-1.5">{item.title}</h5>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.content}</p>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">관련 담당팀</span>
                                    <div className="flex flex-wrap gap-1">
                                      {item.department.map(dept => (
                                        <span key={dept} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                          <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                          {dept}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                                    {item.related_civil_requests && (
                                       <button
                                         onClick={() => { setCivilCategory(item.category); setCivilModalOpen(true); }}
                                         className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all hover:scale-105"
                                         title="클릭하여 국민권익위원회 연동 민원 리스트 보기"
                                       >
                                         🏛️ 국민권익위 민원: 약 {item.related_civil_requests.toLocaleString()}건 ↗
                                       </button>
                                     )}
                                    <span className="flex items-center gap-1 text-slate-600 font-semibold">
                                      <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {item.vote_score}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3.5 h-3.5" /> 댓글 {item.comment_cnt}
                                    </span>
                                    <a
                                      href={item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 transition-colors"
                                      title={item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate max-w-[240px]">
                                        {item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                                      </span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white p-12 text-center text-slate-500 text-xs border border-slate-200 rounded-xl shadow-xs">
              지정한 필터 조건에 부합하는 유사 정책 군집이 존재하지 않습니다.
            </div>
          )
        ) : (
          /* 2. 일반 개별 목록 뷰 */
          filteredListProposals.length > 0 ? (
            filteredListProposals.map((item) => {
              const isGap = item.reply_yn === 'N' && item.vote_score >= 150;
              return (
                <div
                  key={item.id}
                  className={`bg-white p-5 rounded-xl border shadow-xs transition ${
                    isGap 
                      ? 'border-rose-300 ring-1 ring-rose-50 bg-rose-50/5' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-[#0A2351] text-white px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">{item.id}</span>
                      <span className="text-xs text-slate-500 font-bold">{item.district}</span>
                      {isGap && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-extrabold px-1.5 py-0.2 rounded-sm flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> 긴급 정책 공백
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">{item.reg_date}</span>
                      {item.reply_yn === 'Y' ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3 h-3" /> 답변완료
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                          <HelpCircle className="w-3 h-3" /> 미답변 검토중
                        </span>
                      )}
                    </div>
                  </div>

                  <h5 className="text-sm font-bold text-slate-900 mb-1.5">{item.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.content}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">담당 유관팀</span>
                      <div className="flex flex-wrap gap-1">
                        {item.department.map(dept => (
                          <span key={dept} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                            <Building2 className="w-2.5 h-2.5 text-slate-400" />
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono font-bold">
                      {item.related_civil_requests && (
                        <button
                          onClick={() => { setCivilCategory(item.category); setCivilModalOpen(true); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all hover:scale-105"
                          title="클릭하여 국민권익위원회 연동 민원 리스트 보기"
                        >
                          🏛️ 권익위 민원: 약 {item.related_civil_requests.toLocaleString()}건 ↗
                        </button>
                      )}
                      <span className="flex items-center gap-1 text-slate-600">
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {item.vote_score}표
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> 댓글 {item.comment_cnt}개
                      </span>
                      <a
                        href={item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 transition-colors"
                        title={item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[240px]">
                          {item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-12 text-center text-slate-500 text-xs border border-slate-200 rounded-xl shadow-xs">
              지정한 필터 조건에 부합하는 개별 제안이 존재하지 않습니다.
            </div>
          )
        )}
      </div>

      <CivilRequestModal
        isOpen={civilModalOpen}
        category={civilCategory}
        onClose={() => setCivilModalOpen(false)}
      />
    </div>
  );
};
