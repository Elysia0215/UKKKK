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
import { exportToCsv } from '../utils/exportCsv';
import { BatchReplyModal } from './BatchReplyModal';

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
  const [activeBatchGroup, setActiveBatchGroup] = useState<ProposalGroup | null>(null);

  const groupedProposals = useMemo(() => {
    const groups: ProposalGroup[] = [];
    const clusterMap = new Map<number, PolicyProposal[]>();

    proposals.forEach(p => {
      if (p.cluster_size > 1) {
        const list = clusterMap.get(p.cluster_id) || [];
        list.push(p);
        clusterMap.set(p.cluster_id, list);
      } else {
        groups.push({
          id: `GROUP-SINGLE-${p.id}`,
          category: p.category,
          keyword: '단독',
          name: `[단독 제안] ${p.title}`,
          items: [p],
          unansweredCount: p.reply_yn === 'N' ? 1 : 0,
          totalVotes: p.vote_score,
        });
      }
    });

    clusterMap.forEach((items, clusterId) => {
      const totalVotes = items.reduce((acc, curr) => acc + curr.vote_score, 0);
      const unansweredCount = items.filter(p => p.reply_yn === 'N').length;
      const representative = [...items].sort((a, b) => b.vote_score - a.vote_score)[0];

      groups.push({
        id: `GROUP-${clusterId}`,
        category: representative.category,
        keyword: '유사그룹',
        name: `[유사 제안 ${items.length}건 묶음] ${representative.title}`,
        items,
        unansweredCount,
        totalVotes,
      });
    });

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
    const listToExport = viewMode === 'group'
      ? filteredGroupedProposals.flatMap(g => g.items)
      : filteredListProposals;
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
              className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition ${onlyShowGaps
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
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition ${viewMode === 'group'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                유사 제안 그룹화
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition ${viewMode === 'list'
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

        {/* 상세 선택 필터 (정책분류 + 담당부서, 칩 형태로 통일) */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-slate-500 w-16 flex-shrink-0 pt-1">정책분류</span>
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

          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-slate-500 w-16 flex-shrink-0 pt-1">담당부서</span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition font-bold ${
                    selectedDept === dept
                      ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
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
                  className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all duration-200 ${hasGaps && !isSingle
                      ? 'border-rose-200 ring-1 ring-rose-50/50'
                      : 'border-slate-200'
                    }`}
                >
                  {/* 그룹 마스터 바 */}
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition ${hasGaps && !isSingle ? 'bg-rose-50/20 hover:bg-rose-50/50' : 'bg-slate-50/50 hover:bg-slate-100/30'
                      }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.category === '출산' ? 'bg-pink-100 text-pink-700' :
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
                      {group.items.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBatchGroup(group);
                          }}
                          className="text-[11px] font-extrabold bg-[#0A2351] hover:bg-blue-900 text-white px-2.5 py-1 rounded-md shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          title="클릭하여 이 유사 제안 묶음에 공식 공문 일괄 답변 처리"
                        >
                          🏛️ 원스톱 일괄 답변 ↗
                        </button>
                      )}
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
                                className={`p-4 rounded-lg border transition ${isGap
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

                                {/* 몽땅정보 연관 기존 사업 & 부서 랭킹 정보 */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 my-2.5 space-y-2 text-xs">
                                  {item.department_rankings && item.department_rankings.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">매칭 부서 R&R:</span>
                                      {item.department_rankings.map(rank => (
                                        <span
                                          key={rank.dept_name}
                                          className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                                            rank.rank === 1
                                              ? 'bg-blue-600 text-white shadow-2xs'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                          title={`${rank.full_dept} (☎ ${rank.phone}) - ${rank.duty_summary}`}
                                        >
                                          <Building2 className="w-2.5 h-2.5" />
                                          [{rank.role_type}] {rank.dept_name} {rank.phone && `(☎ ${rank.phone})`}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {item.matched_policies && item.matched_policies.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[10px] font-bold text-emerald-700 uppercase">몽땅정보 연관혜택:</span>
                                      {item.matched_policies.map(pol => (
                                        <a
                                          key={pol.policy_id}
                                          href={pol.apply_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition"
                                          title={pol.summary}
                                        >
                                          🎁 {pol.policy_name} ↗
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>

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
                  className={`bg-white p-5 rounded-xl border shadow-xs transition ${isGap
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

                  {/* 몽땅정보 연관 기존 사업 & 부서 랭킹 정보 */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 my-2.5 space-y-2 text-xs">
                    {item.department_rankings && item.department_rankings.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">매칭 부서 R&R:</span>
                        {item.department_rankings.map(rank => (
                          <span
                            key={rank.dept_name}
                            className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                              rank.rank === 1
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                            title={`${rank.full_dept} (☎ ${rank.phone}) - ${rank.duty_summary}`}
                          >
                            <Building2 className="w-2.5 h-2.5" />
                            [{rank.role_type}] {rank.dept_name} {rank.phone && `(☎ ${rank.phone})`}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.matched_policies && item.matched_policies.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">몽땅정보 연관혜택:</span>
                        {item.matched_policies.map(pol => (
                          <a
                            key={pol.policy_id}
                            href={pol.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition"
                            title={pol.summary}
                          >
                            🎁 {pol.policy_name} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

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

      <BatchReplyModal
        isOpen={!!activeBatchGroup}
        clusterId={activeBatchGroup?.id || ''}
        clusterName={activeBatchGroup?.name || ''}
        items={activeBatchGroup?.items || []}
        onClose={() => setActiveBatchGroup(null)}
      />
    </div>
  );
};
