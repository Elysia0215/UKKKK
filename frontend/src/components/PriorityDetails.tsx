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
  Download,
  CheckCircle2,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';
import rawMongttangData from '../data/mongttang.json';
import { MongttangPolicy } from '../types';
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
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedFlows, setSelectedFlows] = useState<string[]>(['전체']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['전체']);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(['전체']);
  const [selectedMicroCategory, setSelectedMicroCategory] = useState<string>('전체');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['전체']);
  const [onlyShowGaps, setOnlyShowGaps] = useState(false); // '정책 공백(미답변+고공감)'만 보기 토글
  const [viewMode, setViewMode] = useState<'list' | 'group'>('group'); // 그룹 보기 vs 개별 리스트 보기
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeBatchGroup, setActiveBatchGroup] = useState<ProposalGroup | null>(null);

  const toggleFilterItem = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => {
    if (val === '전체') {
      setList(['전체']);
      return;
    }
    if (!isMultiSelectMode) {
      setList([val]);
      return;
    }
    // 다중 선택 모드
    if (currentList.includes(val)) {
      const next = currentList.filter(item => item !== val);
      setList(next.length === 0 ? ['전체'] : next);
    } else {
      const next = currentList.filter(item => item !== '전체');
      setList([...next, val]);
    }
  };

  const handleResetFilters = () => {
    setSelectedFlows(['전체']);
    setSelectedCategories(['전체']);
    setSelectedSubCategories(['전체']);
    setSelectedMicroCategory('전체');
    setSelectedDepts(['전체']);
    setSearchTerm('');
    setOnlyShowGaps(false);
  };

  // 몽땅정보 현행 정책 목록
  const mongttangPolicies: MongttangPolicy[] = useMemo(() => {
    if (rawMongttangData && Array.isArray((rawMongttangData as any).DATA)) {
      return (rawMongttangData as any).DATA as MongttangPolicy[];
    }
    return [];
  }, []);

  // 시민 제안 ↔ 몽땅정보 정책 매칭 함수
  const findMatchingPolicy = (title: string, content: string): MongttangPolicy | undefined => {
    const text = (title + ' ' + content).toLowerCase();
    return mongttangPolicies.find(p => {
      if (!p.biz_nm) return false;
      const bizNm = p.biz_nm.toLowerCase();
      const words = bizNm.split(/[\s,·\(\)\-]+/).filter(w => w.length >= 2 && !['지원', '사업', '서울시', '서울형'].includes(w));
      return words.length > 0 && words.some(w => text.includes(w));
    });
  };

  // 1. 유사 제안 그룹핑 로직 (같은 카테고리 + 비슷한 키워드 핵심 단어 매칭)
  const groupedProposals = useMemo(() => {
    const groups: ProposalGroup[] = [];
    const subCatMap = new Map<string, PolicyProposal[]>();

    proposals.forEach(p => {
      const key = p.sub_category || p.category || '기타';
      const list = subCatMap.get(key) || [];
      list.push(p);
      subCatMap.set(key, list);
    });

    subCatMap.forEach((items, key) => {
      const totalVotes = items.reduce((acc, curr) => acc + curr.vote_score, 0);
      const unansweredCount = items.filter(p => p.reply_yn === 'N').length;
      const representative = [...items].sort((a, b) => b.vote_score - a.vote_score)[0];

      if (items.length > 1) {
        groups.push({
          id: `GROUP-SUB-${key}`,
          category: representative.category,
          keyword: key,
          name: `[유사 제안 ${items.length}건 묶음] ${key} - ${representative.title}`,
          items: items.sort((a, b) => b.vote_score - a.vote_score),
          unansweredCount,
          totalVotes,
        });
      } else {
        groups.push({
          id: `GROUP-SINGLE-${representative.id}`,
          category: representative.category,
          keyword: '단독',
          name: `[단독 제안] ${representative.title}`,
          items: [representative],
          unansweredCount: representative.reply_yn === 'N' ? 1 : 0,
          totalVotes: representative.vote_score,
        });
      }
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
      // 2) 분야 계층 필터 (대분류, 중분류, 세분류)
      const matchesCategory = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCategory = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCategory = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      // 3) 정책 흐름 필터
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      // 4) 1순위 주관부서 기준 필터
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      // 5) 정책 공백 토글 (미답변 N 이면서 공감수 150 이상)
      const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);

      return matchesSearch && matchesCategory && matchesSubCategory && matchesMicroCategory && matchesFlow && matchesDept && matchesGap;
    }).sort((a, b) => b.vote_score - a.vote_score); // 기본 공감도순 정렬
  }, [proposals, searchTerm, selectedCategories, selectedSubCategories, selectedMicroCategory, selectedFlows, selectedDepts, onlyShowGaps]);

  // 그룹 보기 필터 결과 (그룹 구성원 필터 후 빈 그룹 배제)
  const filteredGroupedProposals = useMemo(() => {
    return groupedProposals.map(g => {
      const filteredItems = g.items.filter(p => {
        const matchesSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm);
        const matchesCategory = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
        const matchesSubCategory = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
        const matchesMicroCategory = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
        const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
        const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
        const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
        const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);
        return matchesSearch && matchesCategory && matchesSubCategory && matchesMicroCategory && matchesFlow && matchesDept && matchesGap;
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
  }, [groupedProposals, searchTerm, selectedCategories, selectedSubCategories, selectedMicroCategory, selectedFlows, selectedDepts, onlyShowGaps]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const categories: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['전체', ...Array.from(set)];
  }, [proposals]);

  // 계층형 중분류 목록 (선택된 대분류에 연동)
  const subCategories: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if ((selectedCategories.includes('전체') || selectedCategories.includes(p.category)) && p.sub_category) {
        set.add(p.sub_category);
      }
    });
    return ['전체', ...Array.from(set)];
  }, [proposals, selectedCategories]);

  // 계층형 세분류 목록 (선택된 중분류에 연동)
  const microCategories: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if ((selectedCategories.includes('전체') || selectedCategories.includes(p.category)) &&
          (selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category))) &&
          p.micro_category) {
        set.add(p.micro_category);
      }
    });
    return ['전체', ...Array.from(set)];
  }, [proposals, selectedCategories, selectedSubCategories]);

  // 생애주기 정책 흐름 목록
  const policyFlows: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if (p.policy_flow) set.add(p.policy_flow);
    });
    return ['전체', ...Array.from(set)];
  }, [proposals]);

  // 1순위 주관부서 동적 목록 (단순 합산 시 426건 1:1 매칭)
  const departments: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0];
      if (primaryDept) set.add(primaryDept);
    });
    return ['전체', ...Array.from(set)];
  }, [proposals]);

  // --- 타 필터 선택 시 교차 연동 건수 실시간 계산 맵 ---
  // 1) 담당부서 선택에 따른 생애주기별 건수
  const flowCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      if (matchesDept) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.policy_flow) {
          counts[p.policy_flow] = (counts[p.policy_flow] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedDepts]);

  // 2) 담당부서 & 생애주기 선택에 따른 1차 대분류별 건수
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      if (matchesDept && matchesFlow) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedDepts, selectedFlows]);

  // 3) 담당부서 & 생애주기 & 대분류 선택에 따른 2차 중분류별 건수
  const subCatCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      if (matchesDept && matchesFlow && matchesCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.sub_category) {
          counts[p.sub_category] = (counts[p.sub_category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedDepts, selectedFlows, selectedCategories]);

  // 4) 생애주기 & 대분류 선택에 따른 담당부서별 건수
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      if (matchesFlow && matchesCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        counts[primaryDept] = (counts[primaryDept] || 0) + 1;
      }
    });
    return counts;
  }, [proposals, selectedFlows, selectedCategories]);

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

            {/* 보기 모드 변경 & 다중선택 토글 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isMultiSelectMode
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="클릭하여 여러 카테고리/부서를 중복 선택하여 동시에 조회"
              >
                <span>{isMultiSelectMode ? '☑️ 다중 선택 모드 ON' : '☐ 다중 선택 모드 OFF'}</span>
              </button>

              {(selectedFlows[0] !== '전체' || selectedCategories[0] !== '전체' || selectedSubCategories[0] !== '전체' || selectedDepts[0] !== '전체' || searchTerm || onlyShowGaps) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="모든 필터를 기본 전체 상태로 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  초기화
                </button>
              )}

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
        </div>

        {/* 상세 선택 필터 (계층형 대/중/세분류 + 생애주기 정책흐름 + 담당부서) */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          {/* 생애주기 정책흐름 필터 */}
          <div className="flex items-start gap-3 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
            <span className="text-xs font-black text-indigo-900 w-20 flex-shrink-0 pt-1 flex items-center gap-1">
              🌱 생애주기
            </span>
            <div className="flex flex-wrap gap-1.5">
              {policyFlows.map(flow => {
                const count = flowCounts[flow] || 0;
                const isDisabled = flow !== '전체' && count === 0;
                const isSelected = selectedFlows.includes(flow);
                return (
                  <button
                    key={flow}
                    disabled={isDisabled}
                    onClick={() => toggleFilterItem(selectedFlows, setSelectedFlows, flow)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-bold ${
                      isSelected
                        ? 'bg-indigo-700 text-white border-indigo-800 shadow-2xs'
                        : isDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {flow} <span className="text-[10px] opacity-80 font-normal">({count}건)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1차: 대분류 */}
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-1">1차 대분류</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const count = catCounts[cat] || 0;
                const isDisabled = cat !== '전체' && count === 0;
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    disabled={isDisabled}
                    onClick={() => {
                      toggleFilterItem(selectedCategories, setSelectedCategories, cat);
                      setSelectedSubCategories(['전체']);
                      setSelectedMicroCategory('전체');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-bold ${
                      isSelected
                        ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                        : isDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat} <span className="text-[10px] opacity-80 font-normal">({count}건)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2차: 연동 중분류 */}
          {subCategories.length > 1 && (
            <div className="flex items-start gap-3 bg-blue-50/40 p-2 rounded-lg border border-blue-100">
              <span className="text-xs font-bold text-blue-800 w-20 flex-shrink-0 pt-1">└ 2차 중분류</span>
              <div className="flex flex-wrap gap-1.5">
                {subCategories.map(sub => {
                  const count = subCatCounts[sub] || 0;
                  const isDisabled = sub !== '전체' && count === 0;
                  const isSelected = selectedSubCategories.includes(sub);
                  return (
                    <button
                      key={sub}
                      disabled={isDisabled}
                      onClick={() => {
                        toggleFilterItem(selectedSubCategories, setSelectedSubCategories, sub);
                        setSelectedMicroCategory('전체');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition font-bold ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : isDisabled
                          ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                          : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {sub} <span className="text-[10px] opacity-80 font-normal">({count}건)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3차: 연동 세분류 */}
          {microCategories.length > 1 && !selectedSubCategories.includes('전체') && (
            <div className="flex items-start gap-3 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100 ml-4">
              <span className="text-xs font-bold text-emerald-800 w-20 flex-shrink-0 pt-1">└ 3차 세분류</span>
              <div className="flex flex-wrap gap-1.5">
                {microCategories.map(micro => (
                  <button
                    key={micro}
                    onClick={() => setSelectedMicroCategory(micro)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition font-bold ${
                      selectedMicroCategory === micro
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    {micro}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 담당부서 필터 */}
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-1">담당부서</span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map(dept => {
                const count = deptCounts[dept] || 0;
                const isDisabled = dept !== '전체' && count === 0;
                const isSelected = selectedDepts.includes(dept);
                return (
                  <button
                    key={dept}
                    disabled={isDisabled}
                    onClick={() => toggleFilterItem(selectedDepts, setSelectedDepts, dept)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-bold ${
                      isSelected
                        ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                        : isDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {dept} <span className="text-[10px] opacity-80 font-normal">({count}건)</span>
                  </button>
                );
              })}
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
                    <div className="flex items-start sm:items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {group.category}
                      </span>
                      {group.items[0]?.sub_category && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {group.items[0].sub_category}
                        </span>
                      )}
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

                                 {/* 몽땅정보 현행 정책 대조 뱃지 (전략 1) */}
                                {(() => {
                                  const match = findMatchingPolicy(item.title, item.content);
                                  if (match) {
                                    return (
                                      <div className="mb-3 p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-2xs">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                          <span>✅ 현행 정책 시행 중: <strong className="text-emerald-950">[{match.biz_nm}]</strong></span>
                                        </div>
                                        {match.aply_site_addr && match.aply_site_addr !== '.' && (
                                          <a 
                                            href={match.aply_site_addr.startsWith('http') ? match.aply_site_addr : `https://${match.aply_site_addr}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-md font-bold hover:bg-emerald-700 transition flex items-center gap-0.5 shrink-0 shadow-2xs"
                                          >
                                            신청하기 <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="mb-3 p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                          <span>⚠️ 정책 공백: 서울시 몽땅정보 323개 공식 사업과 대조 결과 <strong className="text-amber-950 font-black">미시행 신규 요구</strong></span>
                                        </div>
                                      </div>
                                    );
                                  }
                                })()}

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
                                          title={`${rank.full_dept} (☎ ${rank.phone})\n• 업무: ${rank.duty_summary}\n• 근거: ${rank.matching_reason || '규칙기반 키워드 매칭'}`}
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
