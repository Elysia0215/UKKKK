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
  Sparkles,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';
import { formatProposalContent } from '../utils/formatText';
import rawMongttangData from '../data/mongttang.json';
import classifiedPolicyData from '../data/classified_policy.json';
import civilRequestsData from '../data/civil_requests_all.json';
import { MongttangPolicy } from '../types';
import { BatchReplyModal } from './BatchReplyModal';
import { CivilRequestDetailModal, CivilRequestItem } from './CivilRequestDetailModal';

interface Props {
  proposals: PolicyProposal[];
  initialCategory?: string;
  initialSubCategory?: string;
  initialClusterId?: number;
  selectedDept?: string;
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

export const PriorityDetails: React.FC<Props> = ({
  proposals,
  initialCategory,
  initialSubCategory,
  initialClusterId,
  selectedDept
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedYears, setSelectedYears] = useState<string[]>(['전체']);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'vote_desc' | 'comment_desc'>('date_desc');
  const [selectedFlows, setSelectedFlows] = useState<string[]>(['전체']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : ['전체']
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    initialSubCategory ? [initialSubCategory] : ['전체']
  );
  const [selectedMicroCategory, setSelectedMicroCategory] = useState<string>('전체');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    selectedDept ? [selectedDept] : ['전체']
  );

  // 상단 부서 셀렉터(selectedDept) 변경 시 담당 부서 필터 자동 동기화
  React.useEffect(() => {
    if (selectedDept) {
      setSelectedDepts([selectedDept]);
    }
  }, [selectedDept]);
  const [onlyShowGaps, setOnlyShowGaps] = useState(false); // '정책 공백(미답변+고공감)'만 보기 토글
  const [onlyShow2026Gaps, setOnlyShow2026Gaps] = useState(false); // '2026 최신 정책 공백'만 보기 토글
  const [onlyShowHighVoteNoReply, setOnlyShowHighVoteNoReply] = useState(false); // '공감 500+/댓글 100+ 고공감 미답변' 스마트 모아보기 토글
  const [viewMode, setViewMode] = useState<'list' | 'group'>('group'); // 그룹 보기 vs 개별 리스트 보기
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeBatchGroup, setActiveBatchGroup] = useState<ProposalGroup | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategories([initialCategory]);
    } else {
      setSelectedCategories(['전체']);
    }
    if (initialSubCategory) {
      setSelectedSubCategories([initialSubCategory]);
    } else {
      setSelectedSubCategories(['전체']);
    }
  }, [initialCategory, initialSubCategory, initialClusterId]);

  const handleToggleMultiSelectMode = () => {
    const nextMode = !isMultiSelectMode;
    setIsMultiSelectMode(nextMode);

    // 다중 선택 모드를 켰다가 끄면(OFF), 2개 이상 중복 선택되어 있던 필터들을 '전체'로 즉시 초기화
    if (!nextMode) {
      if (selectedYears.length > 1) setSelectedYears(['전체']);
      if (selectedFlows.length > 1) setSelectedFlows(['전체']);
      if (selectedCategories.length > 1) setSelectedCategories(['전체']);
      if (selectedSubCategories.length > 1) setSelectedSubCategories(['전체']);
      if (selectedDepts.length > 1) setSelectedDepts(['전체']);
    }
  };

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
    setSelectedYears(['전체']);
    setSelectedFlows(['전체']);
    setSelectedCategories(['전체']);
    setSelectedSubCategories(['전체']);
    setSelectedMicroCategory('전체');
    setSelectedDepts(['전체']);
    setSearchTerm('');
    setOnlyShowGaps(false);
    setOnlyShow2026Gaps(false);
    setOnlyShowHighVoteNoReply(false);
    setSortBy('date_desc');
  };

  // 연도 옵션 정의 및 연도별 수량 집계 (타 필터 교차 연동)
  const yearOptions = ['전체', '2026', '2025', '2024', '2023', '2022이전'];
  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    yearOptions.forEach(y => { if (y !== '전체') counts[y] = 0; });

    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCat = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCat = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      if (matchesDept && matchesFlow && matchesCat && matchesSubCat && matchesMicroCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (!p.reg_date) return;
        if (p.reg_date.startsWith('2026')) counts['2026']++;
        else if (p.reg_date.startsWith('2025')) counts['2025']++;
        else if (p.reg_date.startsWith('2024')) counts['2024']++;
        else if (p.reg_date.startsWith('2023')) counts['2023']++;
        else counts['2022이전']++;
      }
    });
    return counts;
  }, [proposals, selectedDepts, selectedFlows, selectedCategories, selectedSubCategories, selectedMicroCategory]);

  // 몽땅정보 현행 정책 목록
  const mongttangPolicies: MongttangPolicy[] = useMemo(() => {
    let rawList: any[] = [];
    if (rawMongttangData && Array.isArray((rawMongttangData as any).DATA)) {
      rawList = (rawMongttangData as any).DATA;
    } else if (Array.isArray(classifiedPolicyData)) {
      rawList = classifiedPolicyData;
    }

    return rawList.map((item: any) => ({
      id: item.id || item['사업명'],
      biz_nm: item.biz_nm || item['사업명'] || '',

      biz_lclsf_nm: item.biz_lclsf_nm || item['사업대분류명'] || item.Category || '기타',
      biz_mclsf_nm: item.biz_mclsf_nm || item['사업중분류명'] || '',
      biz_sclsf_nm: item.biz_sclsf_nm || item['사업소분류명'] || '',
      biz_cn: item.biz_cn || item['사업내용'] || '',
      utztn_trpr_cn: item.utztn_trpr_cn || item['이용대상내용'] || '',
      utztn_mthd_cn: item.utztn_mthd_cn || item['이용방법내용'] || '',
      aref_cn: item.aref_cn || item['문의처내용'] || '',
      aply_site_addr: item.aply_site_addr || item['신청하기사이트주소'] || '',
      deviw_site_addr: item.deviw_site_addr || item['자세히보기사이트주소'] || '',
      trgt_rgn: item.trgt_rgn || item['대상지역'] || ''
    }));
  }, []);

  // 몽땅정보통 링크 검증 및 헬퍼
  const formatPolicyLink = (url?: string) => {
    if (!url || url.trim() === '.' || url.trim() === '' || url.trim() === 'null' || url.trim() === 'undefined') {
      return 'https://umppa.seoul.go.kr/';
    }
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const [civilModalState, setCivilModalState] = useState<{
    proposal: PolicyProposal;
    requests: CivilRequestItem[];
  } | null>(null);

  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);

  // 정책 오매칭 피드백 상태 (localStorage 기반)
  const [policyFeedbackSet, setPolicyFeedbackSet] = useState<Set<string>>(() => {
    try {
      const logs = JSON.parse(localStorage.getItem('policy_mismatch_log') || '[]');
      return new Set(logs.map((l: { proposalId: string; matchedPolicy: string }) => `policy_fb_${l.proposalId}_${l.matchedPolicy}`));
    } catch { return new Set(); }
  });

  // 시민 제안 ↔ 국민신문고 연관 민원 정밀 교차 매칭 함수
  const getMatchingCivilRequests = useMemo(() => {
    const topicKeywords = [
      '신혼부부', '신혼', '주거', '임차보증금', '전세', '이자지원', '주택', '임대', '뱃지', '스마트',
      '키움센터', '키즈카페', '신생아', '특례대출', '난임', '시술비', '산후조리', '산모', '유모차',
      '엘리베이터', '다자녀', '하수도', '취득세', '자동차', '어린이집', '초등', '늘봄', '아동급식',
      '급식카드', '임산부', '배려석', '지하철', '입양', '위기임산부', '휴직', '육아휴직', '아빠',
      '바우처', '결혼', '살림비', '통학', '어린이', '돌봄', '보육', '양육', '출산', '가족', '지원'
    ];

    return (proposal: PolicyProposal): CivilRequestItem[] => {
      const title = proposal.title || '';
      const content = proposal.content || '';
      const fullText = (title + ' ' + content).toLowerCase();
      const pSub = proposal.sub_category || '';
      const pMicro = proposal.micro_category || '';

      let matched = (civilRequestsData as CivilRequestItem[]).filter(req => {
        const reqTitle = (req.title || '').toLowerCase();
        const reqContent = (req.content || '').toLowerCase();
        const reqFull = reqTitle + ' ' + reqContent;
        const cSub = req.sub_category || '';
        const cMicro = req.micro_category || '';

        const subMatch = (pMicro && pMicro === cMicro) || (pSub && pSub === cSub);
        const kwMatches = topicKeywords.filter(kw => fullText.includes(kw) && reqFull.includes(kw));

        if (subMatch && kwMatches.length >= 1) return true;
        if (kwMatches.length >= 2) return true;
        return false;
      });

      // 만약 1차 정밀 매칭 결과가 0건이면, 카테고리 대분류 기반으로 최소 4~8건 매칭 보완
      if (matched.length === 0 && proposal.category) {
        matched = (civilRequestsData as CivilRequestItem[]).filter(req => {
          return req.category && (proposal.category === req.category || proposal.category.includes(req.category.split('·')[0]));
        }).slice(0, 8);
      }

      return matched;
    };
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
          name: `${key} - ${representative.title}`,
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

    return groups;
  }, [proposals]);

  // 필터링 및 날짜/공감도 정렬 적용된 제안 목록
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm);
      const matchesYear = selectedYears.includes('전체') || selectedYears.some(y => {
        if (y === '2026') return p.reg_date?.startsWith('2026');
        if (y === '2025') return p.reg_date?.startsWith('2025');
        if (y === '2024') return p.reg_date?.startsWith('2024');
        if (y === '2023') return p.reg_date?.startsWith('2023');
        if (y === '2022이전') return p.reg_date && p.reg_date < '2023';
        return false;
      });
      const matchesCategory = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCategory = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCategory = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);
      const matches2026Gap = !onlyShow2026Gaps || (p.reg_date?.startsWith('2026') && p.reply_yn === 'N' && p.vote_score >= 150);
      const matchesHighVoteNoReply = !onlyShowHighVoteNoReply || (p.reply_yn === 'N' && (p.vote_score >= 300 || (p.comment_cnt || 0) >= 50));
      return matchesSearch && matchesYear && matchesCategory && matchesSubCategory && matchesMicroCategory && matchesFlow && matchesDept && matchesGap && matches2026Gap && matchesHighVoteNoReply;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return (b.reg_date || '').localeCompare(a.reg_date || '');
      if (sortBy === 'date_asc') return (a.reg_date || '').localeCompare(b.reg_date || '');
      if (sortBy === 'vote_desc') return b.vote_score - a.vote_score;
      if (sortBy === 'comment_desc') return b.comment_cnt - a.comment_cnt;
      return 0;
    });
  }, [proposals, searchTerm, selectedYears, selectedCategories, selectedSubCategories, selectedMicroCategory, selectedFlows, selectedDepts, onlyShowGaps, onlyShow2026Gaps, onlyShowHighVoteNoReply, sortBy]);

  // 그룹 보기 필터 결과 (그룹 구성원 필터 후 빈 그룹 배제)
  const filteredGroupedProposals = useMemo(() => {
    const list = groupedProposals.map(g => {
      const filteredItems = g.items.filter(p => {
        const matchesSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm);
        const matchesYear = selectedYears.includes('전체') || selectedYears.some(y => {
          if (y === '2026') return p.reg_date?.startsWith('2026');
          if (y === '2025') return p.reg_date?.startsWith('2025');
          if (y === '2024') return p.reg_date?.startsWith('2024');
          if (y === '2023') return p.reg_date?.startsWith('2023');
          if (y === '2022이전') return p.reg_date && p.reg_date < '2023';
          return false;
        });
        const matchesCategory = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
        const matchesSubCategory = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
        const matchesMicroCategory = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
        const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
        const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
        const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
        const matchesGap = !onlyShowGaps || (p.reply_yn === 'N' && p.vote_score >= 150);
        const matches2026Gap = !onlyShow2026Gaps || (p.reg_date?.startsWith('2026') && p.reply_yn === 'N' && p.vote_score >= 150);
        const matchesHighVoteNoReply = !onlyShowHighVoteNoReply || (p.reply_yn === 'N' && (p.vote_score >= 300 || (p.comment_cnt || 0) >= 50));
        return matchesSearch && matchesYear && matchesCategory && matchesSubCategory && matchesMicroCategory && matchesFlow && matchesDept && matchesGap && matches2026Gap && matchesHighVoteNoReply;
      }).sort((a, b) => {
        if (sortBy === 'date_desc') return (b.reg_date || '').localeCompare(a.reg_date || '');
        if (sortBy === 'date_asc') return (a.reg_date || '').localeCompare(b.reg_date || '');
        if (sortBy === 'vote_desc') return (b.vote_score || 0) - (a.vote_score || 0);
        if (sortBy === 'comment_desc') return (b.comment_cnt || 0) - (a.comment_cnt || 0);
        return 0;
      });

      if (filteredItems.length === 0) return null;

      const totalVotes = filteredItems.reduce((acc, curr) => acc + (curr.vote_score || 0), 0);
      const totalComments = filteredItems.reduce((acc, curr) => acc + (curr.comment_cnt || 0), 0);
      const unansweredCount = filteredItems.filter(p => p.reply_yn === 'N').length;

      return {
        ...g,
        items: filteredItems,
        totalVotes,
        totalComments,
        unansweredCount
      };
    }).filter((g): g is (ProposalGroup & { totalComments: number }) => g !== null);

    // 그룹 수준에서 선택된 정렬 옵션(등록일 최신/과거, 공감순, 댓글순) 반영!
    return list.sort((ga, gb) => {
      const repA = ga.items[0];
      const repB = gb.items[0];
      if (sortBy === 'date_desc') return (repB?.reg_date || '').localeCompare(repA?.reg_date || '');
      if (sortBy === 'date_asc') return (repA?.reg_date || '').localeCompare(repB?.reg_date || '');
      if (sortBy === 'vote_desc') return gb.totalVotes - ga.totalVotes;
      if (sortBy === 'comment_desc') return gb.totalComments - ga.totalComments;
      return 0;
    });
  }, [groupedProposals, searchTerm, selectedYears, selectedCategories, selectedSubCategories, selectedMicroCategory, selectedFlows, selectedDepts, onlyShowGaps, onlyShow2026Gaps, onlyShowHighVoteNoReply, sortBy]);

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

  // 1순위 주관부서 동적 목록
  const departments: string[] = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0];
      if (primaryDept) set.add(primaryDept);
    });
    return ['전체', ...Array.from(set)];
  }, [proposals]);

  // --- 타 필터 선택 시 교차 연동 건수 실시간 계산 맵 ---
  // 1) 타 필터 선택에 따른 생애주기별 건수 (연도, 부서, 대분류, 중분류, 세분류 선택 연동)
  const flowCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const regYear = p.reg_year || '2022이전';
      const matchesYear = selectedYears.includes('전체') || selectedYears.includes(regYear);
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCat = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCat = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      if (matchesYear && matchesDept && matchesCat && matchesSubCat && matchesMicroCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.policy_flow) {
          counts[p.policy_flow] = (counts[p.policy_flow] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedYears, selectedDepts, selectedCategories, selectedSubCategories, selectedMicroCategory]);

  // 2) 타 필터 선택에 따른 1차 대분류별 건수 (연도, 부서, 생애주기, 중분류, 세분류 선택 연동)
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const regYear = p.reg_year || '2022이전';
      const matchesYear = selectedYears.includes('전체') || selectedYears.includes(regYear);
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesSubCat = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCat = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      if (matchesYear && matchesDept && matchesFlow && matchesSubCat && matchesMicroCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedYears, selectedDepts, selectedFlows, selectedSubCategories, selectedMicroCategory]);

  // 3) 타 필터 선택에 따른 2차 중분류별 건수 (연도, 부서, 생애주기, 대분류, 세분류 선택 연동)
  const subCatCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const regYear = p.reg_year || '2022이전';
      const matchesYear = selectedYears.includes('전체') || selectedYears.includes(regYear);
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesMicroCat = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      if (matchesYear && matchesDept && matchesFlow && matchesCat && matchesMicroCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.sub_category) {
          counts[p.sub_category] = (counts[p.sub_category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedYears, selectedDepts, selectedFlows, selectedCategories, selectedMicroCategory]);

  // 3-1) 타 필터 선택에 따른 3차 세분류별 건수 (연도, 부서, 생애주기, 대분류, 중분류 선택 연동)
  const microCatCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const regYear = p.reg_year || '2022이전';
      const matchesYear = selectedYears.includes('전체') || selectedYears.includes(regYear);
      const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
      const matchesDept = selectedDepts.includes('전체') || selectedDepts.includes(primaryDept) || p.department.some(d => selectedDepts.includes(d));
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCat = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      if (matchesYear && matchesDept && matchesFlow && matchesCat && matchesSubCat) {
        counts['전체'] = (counts['전체'] || 0) + 1;
        if (p.micro_category) {
          counts[p.micro_category] = (counts[p.micro_category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [proposals, selectedYears, selectedDepts, selectedFlows, selectedCategories, selectedSubCategories]);

  // 4) 타 필터 선택에 따른 담당부서별 건수 (연도, 생애주기, 대분류, 중분류, 세분류 선택 연동)
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': 0 };
    proposals.forEach(p => {
      const regYear = p.reg_year || '2022이전';
      const matchesYear = selectedYears.includes('전체') || selectedYears.includes(regYear);
      const matchesFlow = selectedFlows.includes('전체') || (p.policy_flow && selectedFlows.includes(p.policy_flow));
      const matchesCat = selectedCategories.includes('전체') || selectedCategories.includes(p.category);
      const matchesSubCat = selectedSubCategories.includes('전체') || (p.sub_category && selectedSubCategories.includes(p.sub_category));
      const matchesMicroCat = selectedMicroCategory === '전체' || p.micro_category === selectedMicroCategory;
      if (matchesYear && matchesFlow && matchesCat && matchesSubCat && matchesMicroCat) {
        const primaryDept = p.department_rankings?.[0]?.dept_name || p.department[0] || '미지정';
        counts['전체'] = (counts['전체'] || 0) + 1;
        counts[primaryDept] = (counts[primaryDept] || 0) + 1;
      }
    });
    return counts;
  }, [proposals, selectedYears, selectedFlows, selectedCategories, selectedSubCategories, selectedMicroCategory]);

  // 자동으로 0건이 된 필터 선택을 제외(pruning)해주는 반응형 이펙트 추가
  React.useEffect(() => {
    // 1. 연도 필터 정제
    const validYears = selectedYears.filter(y => y === '전체' || (yearCounts[y] || 0) > 0);
    if (validYears.length === 0) {
      setSelectedYears(['전체']);
    } else if (validYears.length !== selectedYears.length) {
      setSelectedYears(validYears);
    }

    // 2. 생애주기 필터 정제
    const validFlows = selectedFlows.filter(flow => flow === '전체' || (flowCounts[flow] || 0) > 0);
    if (validFlows.length === 0) {
      setSelectedFlows(['전체']);
    } else if (validFlows.length !== selectedFlows.length) {
      setSelectedFlows(validFlows);
    }

    // 3. 대분류 필터 정제
    const validCats = selectedCategories.filter(cat => cat === '전체' || (catCounts[cat] || 0) > 0);
    if (validCats.length === 0) {
      setSelectedCategories(['전체']);
    } else if (validCats.length !== selectedCategories.length) {
      setSelectedCategories(validCats);
    }

    // 4. 중분류 필터 정제
    const validSubs = selectedSubCategories.filter(sub => sub === '전체' || (subCatCounts[sub] || 0) > 0);
    if (validSubs.length === 0) {
      setSelectedSubCategories(['전체']);
    } else if (validSubs.length !== selectedSubCategories.length) {
      setSelectedSubCategories(validSubs);
    }

    // 5. 세분류 필터 정제
    if (selectedMicroCategory !== '전체' && (microCatCounts[selectedMicroCategory] || 0) === 0) {
      setSelectedMicroCategory('전체');
    }

    // 6. 담당부서 필터 정제
    const validDepts = selectedDepts.filter(dept => dept === '전체' || (deptCounts[dept] || 0) > 0);
    if (validDepts.length === 0) {
      setSelectedDepts(['전체']);
    } else if (validDepts.length !== selectedDepts.length) {
      setSelectedDepts(validDepts);
    }
  }, [
    yearCounts, flowCounts, catCounts, subCatCounts, microCatCounts, deptCounts,
    selectedYears, selectedFlows, selectedCategories, selectedSubCategories, selectedMicroCategory, selectedDepts
  ]);

  const handleExportProposals = () => {
    const listToExport = viewMode === 'group'
      ? filteredGroupedProposals.flatMap(g => g.items)
      : filteredProposals;
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

    const yearTag = selectedYears.includes('전체') ? '전체연도' : selectedYears.join('_');
    const sortTag = sortBy === 'date_desc' ? '등록일최신순' : sortBy === 'date_asc' ? '등록일과거순' : sortBy === 'vote_desc' ? '공감높은순' : '댓글많은순';
    const gapTag = onlyShow2026Gaps ? '_2026최신공백' : onlyShowGaps ? '_정책공백' : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `서울시_출산육아_제안목록_${yearTag}_${sortTag}${gapTag}_${listToExport.length}건_${dateStr}.csv`;

    exportToCsv(filename, exportData);
  };

  return (
    <div className="space-y-4">
      {/* 1. 최상단 컴팩트 툴바 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* 좌측: 실시간 키워드 빠른 검색 */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="제목, 본문 키워드로 빠른 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8.5 pr-3 py-1.5 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0A2351]/20 focus:border-[#0A2351] transition bg-slate-50/50"
          />
        </div>

        {/* 우측: 초기화, 정렬, 다중선택, 보기모드, 맞춤 CSV 다운로드 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 초기화 버튼 (정렬 좌측에 상시 노출되도록 배치, 필터 활성화 상태에 따라 스타일 변경) */}
          {(() => {
            const isFilterActive =
              !selectedYears.includes('전체') ||
              !selectedFlows.includes('전체') ||
              !selectedCategories.includes('전체') ||
              !selectedSubCategories.includes('전체') ||
              !selectedDepts.includes('전체') ||
              selectedMicroCategory !== '전체' ||
              searchTerm !== '' ||
              onlyShowGaps ||
              onlyShow2026Gaps ||
              sortBy !== 'date_desc';

            return (
              <button
                onClick={handleResetFilters}
                disabled={!isFilterActive}
                className={`text-[11px] px-2 py-1.5 rounded-lg border font-bold transition flex items-center gap-1 cursor-pointer ${isFilterActive
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                title="모든 검색 및 필터 조건을 초기 상태로 리셋합니다."
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>
            );
          })()}

          {/* 정렬 셀렉터 */}
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-black text-slate-500 pl-1.5 pr-0.5">정렬</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[11px] px-1.5 py-1 rounded-md font-bold bg-white text-slate-800 border-0 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="date_desc">📅 등록일 최신</option>
              <option value="date_asc">⏳ 등록일 과거</option>
              <option value="vote_desc">👍 공감 높은순</option>
              <option value="comment_desc">💬 댓글 많은순</option>
            </select>
          </div>

          {/* 다중 선택 토글 */}
          <button
            onClick={handleToggleMultiSelectMode}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-bold transition cursor-pointer ${isMultiSelectMode
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
          >
            <span>{isMultiSelectMode ? '☑️ 다중선택 ON' : '☐ 다중선택 OFF'}</span>
          </button>

          {/* 보기 모드 (Segmented Control) */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
            <button
              onClick={() => setViewMode('group')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${viewMode === 'group'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1" />
              그룹화
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
              리스트
            </button>
          </div>



          {/* 맞춤 CSV 다운로드 (가장 우측 배치) */}
          <button
            onClick={handleExportProposals}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
            title="선택된 연도 및 정렬 조건으로 맞춤 CSV 파일 다운로드"
          >
            <Download className="w-3 h-3" /> 맞춤 CSV
          </button>
        </div>
      </div>

      {/* 2. 고정밀 필터 제어판 */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">

        {/* 1. 제안 연도 (Moved to the top!) */}
        <div className="flex items-start gap-3 py-1 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-black text-slate-600 w-20 flex-shrink-0 pt-0.5 flex items-center gap-1">
            📅 제안 연도
          </span>
          <div className="flex flex-wrap gap-1">
            {yearOptions.map(y => {
              const count = yearCounts[y] || 0;
              const isDisabled = y !== '전체' && count === 0;
              const isSelected = selectedYears.includes(y);
              const isNew2026 = y === '2026';
              return (
                <button
                  key={y}
                  disabled={isDisabled}
                  onClick={() => toggleFilterItem(selectedYears, setSelectedYears, y)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border transition font-bold cursor-pointer ${isDisabled
                      ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                      : isSelected
                        ? isNew2026 ? 'bg-[#10B981] text-white border-[#10B981] shadow-2xs' : 'bg-[#0A2351] text-white border-[#0A2351]'
                        : isNew2026
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {y === '2026' ? '🔥 2026 최신' : y === '2022이전' ? '2022이전 과거제안' : `${y}년`}
                  <span className="text-[9px] opacity-80 font-normal ml-0.5">({count}건)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1.5. 🚨 긴급 정책 공백 및 미답변 전용 필터 (원클릭 토글 칩) */}
        <div className="flex items-center gap-3 py-1 border-b border-slate-100 pb-1.5 bg-rose-50/40 -mx-3.5 px-3.5 rounded-md">
          <span className="text-xs font-black text-rose-800 w-20 flex-shrink-0 flex items-center gap-1">
            🚨 긴급 필터
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setOnlyShowGaps(!onlyShowGaps)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full border transition font-extrabold cursor-pointer flex items-center gap-1 shadow-2xs ${
                onlyShowGaps
                  ? 'bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
              title="공감 150표 이상 획득했으나 아직 행정 답변이 미완료된 긴급 정책 공백 안건만 필터링"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>🚨 긴급 정책 공백 (150+ 공감 미답변)</span>
            </button>

            <button
              onClick={() => setOnlyShow2026Gaps(!onlyShow2026Gaps)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full border transition font-extrabold cursor-pointer flex items-center gap-1 shadow-2xs ${
                onlyShow2026Gaps
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm animate-pulse'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
              title="2026년에 새로 접수된 공감 150표 이상 미답변 신규 안건만 필터링"
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>⚡ 2026 최신 긴급 공백</span>
            </button>

            <button
              onClick={() => setOnlyShowHighVoteNoReply(!onlyShowHighVoteNoReply)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full border transition font-extrabold cursor-pointer flex items-center gap-1 shadow-2xs ${
                onlyShowHighVoteNoReply
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                  : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
              }`}
              title="공감 300표 이상 또는 댓글 50개 이상인 시민 집중 관심 미답변 제안 필터링"
            >
              <MessageSquare className="w-3 h-3" />
              <span>💬 고공감·댓글 다수 미답변</span>
            </button>

            {(onlyShowGaps || onlyShow2026Gaps || onlyShowHighVoteNoReply) && (
              <span className="text-[10px] text-rose-600 font-bold bg-white px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                필터 적용 중! (클릭시 필터 해제)
              </span>
            )}
          </div>
        </div>

        {/* 2. 생애주기 정책흐름 필터 */}
        <div className="flex items-start gap-3 py-1 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-black text-[#0A2351] w-20 flex-shrink-0 pt-0.5 flex items-center gap-1">
            🌱 생애주기
          </span>
          <div className="flex flex-wrap gap-1">
            {policyFlows.map(flow => {
              const count = flowCounts[flow] || 0;
              const isDisabled = flow !== '전체' && count === 0;
              const isSelected = selectedFlows.includes(flow);
              return (
                <button
                  key={flow}
                  disabled={isDisabled}
                  onClick={() => toggleFilterItem(selectedFlows, setSelectedFlows, flow)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border transition font-bold cursor-pointer ${isDisabled
                      ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {flow} <span className="text-[9px] opacity-80 font-normal">({count}건)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 1차 대분류 */}
        <div className="flex items-start gap-3 py-1 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-0.5">1차 대분류</span>
          <div className="flex flex-wrap gap-1">
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
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border transition font-bold cursor-pointer ${isDisabled
                      ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {cat} <span className="text-[9px] opacity-80 font-normal">({count}건)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 2차 중분류 (1차 대분류 바로 밑에 계층형 └ 2차 중분류로 노출!) */}
        {subCategories.length > 1 && (
          <div className="flex items-start gap-3 py-1 border-b border-slate-100 pb-1.5 animate-fade-in bg-slate-50/50 p-2 rounded-lg">
            <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-0.5 pl-2">└ 2차 중분류</span>
            <div className="flex flex-wrap gap-1">
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
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition font-bold cursor-pointer ${isDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {sub} <span className="text-[9px] opacity-80 font-normal">({count}건)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. 3차 세분류 (2차 중분류가 특정값으로 선택되었을 때만 그 아래 계층형 └ 3차 세분류 노출!) */}
        {microCategories.length > 1 && !selectedSubCategories.includes('전체') && (
          <div className="flex items-start gap-3 py-1 border-b border-slate-100 pb-1.5 animate-fade-in bg-slate-50/80 p-2 rounded-lg pl-6">
            <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-0.5">└ 3차 세분류</span>
            <div className="flex flex-wrap gap-1">
              {microCategories.map(micro => {
                const count = microCatCounts[micro] || 0;
                const isDisabled = micro !== '전체' && count === 0;
                const isSelected = selectedMicroCategory === micro;
                return (
                  <button
                    key={micro}
                    disabled={isDisabled}
                    onClick={() => setSelectedMicroCategory(micro)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition font-bold cursor-pointer ${isDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {micro} <span className="text-[9px] opacity-80 font-normal">({count}건)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. 담당부서 필터 */}
        <div className="flex items-start gap-3 py-1 pb-1">
          <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0 pt-0.5">담당부서</span>
          <div className="flex flex-wrap gap-1">
            {departments.map(dept => {
              const count = deptCounts[dept] || 0;
              const isDisabled = dept !== '전체' && count === 0;
              const isSelected = selectedDepts.includes(dept);
              return (
                <button
                  key={dept}
                  disabled={isDisabled}
                  onClick={() => toggleFilterItem(selectedDepts, setSelectedDepts, dept)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition font-bold cursor-pointer ${isDisabled
                      ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {dept} <span className="text-[9px] opacity-80 font-normal">({count}건)</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 실시간 필터 현황 요약 */}
      <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3 px-4 rounded-xl">
        <div className="text-xs text-blue-800 font-bold">
          {viewMode === 'group' ? (
            <span>필터 조건에 부합하는 <strong>{filteredGroupedProposals.length}개 유사 정책 군집(그룹)</strong>이 발견되었습니다.</span>
          ) : (
            <span>필터 조건에 부합하는 <strong>{filteredProposals.length}건의 개별 제안</strong>이 발견되었습니다.</span>
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
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          {!isSingle ? (
                            <span className="text-xs bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded shadow-2xs">
                              유사 제안 {group.items.length}건 묶음
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                              단독 제안
                            </span>
                          )}
                          <span>{group.name}</span>
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
                                    {item.vote_score >= 150 && (
                                      <div className="relative group/star inline-block">
                                        <span className="text-[10.5px] font-black text-amber-500 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer hover:animate-pulse">
                                          ⭐ 우수제안
                                        </span>
                                        {/* 호버 시 즉시 펼쳐지는 럭셔리 툴팁 창 */}
                                        <div className="hidden group-hover/star:block absolute left-0 top-full mt-1.5 z-50 whitespace-nowrap bg-slate-900 text-white text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-in fade-in duration-150">
                                          <span className="text-yellow-400 font-extrabold mr-1">🔥 150+ 공감</span>
                                          <span>시민 공감 150표 이상 획득 우수 제안</span>
                                          <div className="absolute -top-1 left-3 w-2 h-2 bg-slate-900 border-l border-t border-slate-700 rotate-45" />
                                        </div>
                                      </div>
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
                                <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">{formatProposalContent(item.content)}</p>

                                {/* 몽땅정보 현행 정책 대조 뱃지 (전략 1) */}
                                {(() => {
                                  const match = findMatchingPolicy(item.title, item.content);
                                  if (match) {
                                    // 해당 제안-정책 매칭이 피드백으로 "관련없음" 처리되었는지 확인
                                    const fbKey = `policy_fb_${item.id}_${match.biz_nm}`;
                                    const wasFlagged = policyFeedbackSet.has(fbKey);
                                    return (
                                      <div className={`mb-3 p-2.5 border rounded-lg text-xs flex items-center justify-between gap-2 shadow-2xs ${
                                        wasFlagged
                                          ? 'bg-slate-50/90 border-slate-300 text-slate-500'
                                          : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                                      }`}>
                                        <div className="flex items-center gap-1.5 font-bold min-w-0">
                                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${wasFlagged ? 'text-slate-400' : 'text-emerald-600'}`} />
                                          <span className={wasFlagged ? 'line-through' : ''}>
                                            ✅ 현행 정책 시행 중: <strong className={wasFlagged ? 'text-slate-600' : 'text-emerald-950'}>[{match.biz_nm}]</strong>
                                          </span>
                                          {wasFlagged && (
                                            <span className="text-[8px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded font-black shrink-0">관련없음 신고됨</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {!wasFlagged && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // localStorage에 피드백 저장
                                                const log = JSON.parse(localStorage.getItem('policy_mismatch_log') || '[]');
                                                log.push({
                                                  id: `PFB-${Date.now()}`,
                                                  proposalId: item.id,
                                                  proposalTitle: item.title,
                                                  matchedPolicy: match.biz_nm,
                                                  type: 'policy_mismatch',
                                                  timestamp: new Date().toISOString(),
                                                });
                                                localStorage.setItem('policy_mismatch_log', JSON.stringify(log));
                                                setPolicyFeedbackSet(prev => new Set([...prev, fbKey]));
                                              }}
                                              className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-bold hover:bg-rose-100 transition cursor-pointer flex items-center gap-0.5"
                                              title="이 정책이 실제로 관련 없다면 클릭하여 오매칭을 신고합니다"
                                            >
                                              🚩 관련없음
                                            </button>
                                          )}
                                          {match.aply_site_addr && match.aply_site_addr !== '.' && (
                                            <a
                                              href={match.aply_site_addr.startsWith('http') ? match.aply_site_addr : `https://${match.aply_site_addr}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-md font-bold hover:bg-emerald-700 transition flex items-center gap-0.5 shadow-2xs"
                                            >
                                              신청하기 <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          )}
                                        </div>
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
                                {/* 몽땅정보 연관 기존 사업 & 부서 랭킹 정보 (슬림 뷰 + 접기/펼치기 토글 UX) */}
                                {(() => {
                                  const reqs = getMatchingCivilRequests(item);
                                  const isDetailOpen = expandedDetailId === item.id;
                                  const primaryRank = item.department_rankings && item.department_rankings.length > 0 ? item.department_rankings[0] : null;
                                  const primaryPolicy = item.matched_policies && item.matched_policies.length > 0 ? item.matched_policies[0] : null;

                                  return (
                                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60 my-2 space-y-2 text-xs">
                                      {/* 기본 요약 1줄 바 (주관부서 1개 + 몽땅혜택 1개 + 국민신문고 뱃지 + 상세토글) */}
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {primaryRank && (
                                            <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                                              <Building2 className="w-2.5 h-2.5" />
                                              [주관부서] {primaryRank.dept_name} {primaryRank.phone && `(☎ ${primaryRank.phone})`}
                                            </span>
                                          )}

                                          {primaryPolicy && (
                                            <a
                                              href={formatPolicyLink(primaryPolicy.apply_url)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold transition flex items-center gap-1"
                                              title={primaryPolicy.summary}
                                            >
                                              🎁 {primaryPolicy.policy_name}
                                              {item.matched_policies.length > 1 && (
                                                <span className="bg-emerald-200/70 text-emerald-900 px-1 py-0.2 rounded text-[8.5px]">
                                                  +{item.matched_policies.length - 1}개
                                                </span>
                                              )}
                                            </a>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          {reqs.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setCivilModalState({ proposal: item, requests: reqs });
                                              }}
                                              className="text-[9.5px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded font-black transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                            >
                                              <span>📩 민원 {reqs.length}건 ↗</span>
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedDetailId(isDetailOpen ? null : item.id);
                                            }}
                                            className="text-[9.5px] bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 font-extrabold px-2 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                          >
                                            <span>{isDetailOpen ? '상세 접기 ▴' : '연관 R&R/혜택 ▾'}</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* 토글 클릭 시 펼쳐지는 세부 협조부서 및 몽땅혜택 풀목록 */}
                                      {isDetailOpen && (
                                        <div className="pt-2 border-t border-slate-200/70 space-y-2 animate-fade-in text-[10px]">
                                          {item.department_rankings && item.department_rankings.length > 1 && (
                                            <div className="space-y-1">
                                              <span className="font-extrabold text-slate-500 block">🏢 협조 부서 랭킹 (2, 3순위):</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {item.department_rankings.slice(1).map(rank => (
                                                  <span key={rank.dept_name} className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-bold">
                                                    [{rank.role_type}] {rank.dept_name} {rank.phone && `(☎ ${rank.phone})`}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {item.matched_policies && item.matched_policies.length > 0 && (
                                            <div className="space-y-1">
                                              <span className="font-extrabold text-emerald-800 block">🎁 몽땅정보 연관혜택 풀목록 ({item.matched_policies.length}건):</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {item.matched_policies.map(pol => (
                                                  <a
                                                    key={pol.policy_id}
                                                    href={formatPolicyLink(pol.apply_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold transition"
                                                  >
                                                    {pol.policy_name} ↗
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

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
          filteredProposals.length > 0 ? (
            filteredProposals.map((item) => {
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
                      {item.reg_date?.startsWith('2026') ? (
                        <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded shadow-2xs">
                          🔥 NEW 2026
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200 px-2 py-0.5 rounded">
                          {item.reg_date ? item.reg_date.substring(0, 4) + '년' : '과거'}
                        </span>
                      )}
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
                  <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">{formatProposalContent(item.content)}</p>

                  {/* 몽땅정보 연관 기존 사업 & 부서 랭킹 정보 */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 my-2.5 space-y-2 text-xs">
                    {item.department_rankings && item.department_rankings.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">매칭 부서 R&R:</span>
                        {item.department_rankings.map(rank => (
                          <span
                            key={rank.dept_name}
                            className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${rank.rank === 1
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
                            href={formatPolicyLink(pol.apply_url)}
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

                    {(() => {
                      const reqs = getMatchingCivilRequests(item);
                      if (reqs.length > 0) {
                        return (
                          <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-indigo-700 uppercase">국민신문고 연관 민원:</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                                실시간 접수 민원 {reqs.length}건 매칭 완료
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCivilModalState({ proposal: item, requests: reqs });
                              }}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-0.5 rounded-md font-extrabold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <span>📩 국민신문고 민원 원문 보기 ({reqs.length}건)</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                      {item.vote_score >= 150 && (
                        <div className="relative group/star inline-block">
                          <span className="text-[10.5px] font-black text-amber-500 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer hover:animate-pulse">
                            ⭐ 우수제안
                          </span>
                          <div className="hidden group-hover/star:block absolute left-0 bottom-full mb-1.5 z-50 whitespace-nowrap bg-slate-900 text-white text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-in fade-in duration-150">
                            <span className="text-yellow-400 font-extrabold mr-1">🔥 150+ 공감</span>
                            <span>시민 공감 150표 이상 획득 우수 제안</span>
                            <div className="absolute -bottom-1 left-3 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
                          </div>
                        </div>
                      )}
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

      <CivilRequestDetailModal
        isOpen={!!civilModalState}
        proposal={civilModalState?.proposal || null}
        relatedCivilRequests={civilModalState?.requests || []}
        onClose={() => setCivilModalState(null)}
      />
    </div>
  );
};
