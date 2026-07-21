import React, { useMemo } from 'react';
import { PolicyProposal } from '../types';
import { Calendar, Heart, Layers, GitBranch, Filter, Building, Link2, Sparkles } from 'lucide-react';

export interface FilterState {
  year: string;
  lifecycle: string;
  category1: string;
  category2: string;
  category3: string;
  department: string;
}

interface Props {
  proposals: PolicyProposal[];
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
}

// 100% 정밀 분류체계 룩업 맵 (생애주기 - 대분류 - 중분류 매핑)
const TAXONOMY_MAPPING = [
  {
    lifecycle: '임신 전·임신 중',
    cat1: '임신·난임·생식건강',
    subList: ['난임 시술비·횟수·나이 제한', '난임 주사·보건소 접근성', '임산부 건강검사·배려']
  },
  {
    lifecycle: '출산 직후',
    cat1: '출산·산후 초기지원',
    subList: ['출산지원금·장려금', '산후조리·도우미', '출생축하·신생아 초기지원']
  },
  {
    lifecycle: '영유아·초등 돌봄',
    cat1: '보육·돌봄 인프라',
    subList: ['어린이집·유치원', '초등돌봄·방과후·키움센터', '아이돌봄·조부모·베이비시터', '야간·주말·긴급보육']
  },
  {
    lifecycle: '양육기 생활지원',
    cat1: '다자녀·양육비·생활지원',
    subList: ['다자녀 기준·혜택', '교육비·서울런', '생활비·공공요금·문화비', '지역 간 혜택 형평성']
  },
  {
    lifecycle: '도시생활 기반',
    cat1: '주거·교통·도시생활환경',
    subList: ['무주택·월세·주거비', '유모차·교통 접근성', '공공시설·생활편의']
  },
  {
    lifecycle: '부모 노동·돌봄 병행',
    cat1: '일·가정 양립·부모 노동',
    subList: ['육아휴직·출산휴가', '근로시간 단축', '자영업·프리랜서·야간근무', '경력단절·자립']
  },
  {
    lifecycle: '사각지대 보호',
    cat1: '취약·다양가족 사각지대',
    subList: ['한부모·미혼모/부', '위기임산부', '다문화·외국인', '저소득·차상위·입양']
  },
  {
    lifecycle: '공통 행정·정보',
    cat1: '정보·상담·교육·거버넌스',
    subList: ['정보 통합·앱·플랫폼', '상담·매칭', '부모교육·아빠교육', '성평등·인식개선', '신청·서류·기준 개선']
  }
];

export const MultiTierCategoryFilter: React.FC<Props> = ({
  proposals,
  filterState,
  onFilterChange,
}) => {
  // 0. 역방향 룩업: 중분류 ➔ { 대분류, 생애주기 }
  const subToParentsMap = useMemo(() => {
    const map: Record<string, { cat1: string; lifecycle: string }> = {};
    TAXONOMY_MAPPING.forEach(item => {
      item.subList.forEach(sub => {
        map[sub] = { cat1: item.cat1, lifecycle: item.lifecycle };
      });
    });
    // 추가 동적 매핑
    proposals.forEach(p => {
      if (p.sub_category && p.category && !map[p.sub_category]) {
        map[p.sub_category] = { cat1: p.category, lifecycle: p.policy_flow || '기타' };
      }
    });
    return map;
  }, [proposals]);

  // 대분류 ➔ { 생애주기, subList }
  const cat1ToDetailsMap = useMemo(() => {
    const map: Record<string, { lifecycle: string; subList: string[] }> = {};
    TAXONOMY_MAPPING.forEach(item => {
      map[item.cat1] = { lifecycle: item.lifecycle, subList: item.subList };
    });
    return map;
  }, []);

  // 1. 연도별 수량 계산
  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {
      전체년: proposals.length,
      '2026': proposals.filter(p => p.reg_date?.startsWith('2026')).length,
      '2025': proposals.filter(p => p.reg_date?.startsWith('2025')).length,
      '2024': proposals.filter(p => p.reg_date?.startsWith('2024')).length,
      '2023': proposals.filter(p => p.reg_date?.startsWith('2023')).length,
      '2022이전': proposals.filter(p => p.reg_date && p.reg_date < '2023').length,
    };
    return counts;
  }, [proposals]);

  // 2. 생애주기 수량
  const lifecycleCounts = useMemo(() => {
    const map: Record<string, number> = { 전체: proposals.length };
    proposals.forEach(p => {
      const flow = p.policy_flow || '기타';
      map[flow] = (map[flow] || 0) + 1;
    });
    return map;
  }, [proposals]);

  // 3. 1차 대분류 목록 및 수량 (생애주기가 선택되어 있다면 해당 생애주기 내 대분류만 강조)
  const cat1Counts = useMemo(() => {
    const baseList = filterState.lifecycle === '전체'
      ? proposals
      : proposals.filter(p => p.policy_flow === filterState.lifecycle);

    const map: Record<string, number> = { 전체: baseList.length };
    baseList.forEach(p => {
      const cat = p.category || '기타';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [proposals, filterState.lifecycle]);

  // 4. 2차 중분류 목록 및 수량 (선택된 1차 대분류가 있으면 해당 대분류 내 중분류만 정밀 노출!)
  const cat2Counts = useMemo(() => {
    let baseList = proposals;

    if (filterState.category1 !== '전체') {
      baseList = proposals.filter(p => p.category === filterState.category1);
    } else if (filterState.lifecycle !== '전체') {
      baseList = proposals.filter(p => p.policy_flow === filterState.lifecycle);
    }

    const map: Record<string, number> = { 전체: baseList.length };
    baseList.forEach(p => {
      const sub = p.sub_category || '기타';
      map[sub] = (map[sub] || 0) + 1;
    });
    return map;
  }, [proposals, filterState.category1, filterState.lifecycle]);

  // 5. 3차 세분류 목록 및 수량
  const cat3Counts = useMemo(() => {
    let baseList = proposals;

    if (filterState.category2 !== '전체') {
      baseList = proposals.filter(p => p.sub_category === filterState.category2);
    } else if (filterState.category1 !== '전체') {
      baseList = proposals.filter(p => p.category === filterState.category1);
    }

    const map: Record<string, number> = { 전체: baseList.length };
    baseList.forEach(p => {
      const micro = p.micro_category || p.title || '기타';
      map[micro] = (map[micro] || 0) + 1;
    });
    return map;
  }, [proposals, filterState.category1, filterState.category2]);

  // 6. 담당부서 수량
  const deptCounts = useMemo(() => {
    const map: Record<string, number> = { 전체: proposals.length };
    proposals.forEach(p => {
      if (p.department && p.department.length > 0) {
        p.department.forEach(d => {
          map[d] = (map[d] || 0) + 1;
        });
      } else {
        map['미지정'] = (map['미지정'] || 0) + 1;
      }
    });
    return map;
  }, [proposals]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.year !== '전체년') count++;
    if (filterState.lifecycle !== '전체') count++;
    if (filterState.category1 !== '전체') count++;
    if (filterState.category2 !== '전체') count++;
    if (filterState.category3 !== '전체') count++;
    if (filterState.department !== '전체') count++;
    return count;
  }, [filterState]);

  const handleReset = () => {
    onFilterChange({
      year: '전체년',
      lifecycle: '전체',
      category1: '전체',
      category2: '전체',
      category3: '전체',
      department: '전체',
    });
  };

  // 생애주기 클릭 핸들러
  const handleLifecycleClick = (lf: string) => {
    if (filterState.lifecycle === lf || lf === '전체') {
      onFilterChange({
        ...filterState,
        lifecycle: '전체',
        category1: '전체',
        category2: '전체',
        category3: '전체',
      });
    } else {
      // 해당 생애주기의 대표 1차 대분류 찾아 자동 선택
      const matchItem = TAXONOMY_MAPPING.find(t => t.lifecycle === lf);
      onFilterChange({
        ...filterState,
        lifecycle: lf,
        category1: matchItem ? matchItem.cat1 : '전체',
        category2: '전체',
        category3: '전체',
      });
    }
  };

  // 1차 대분류 클릭 핸들러 (2차 중분류 연동 노출)
  const handleCat1Click = (cat: string) => {
    if (filterState.category1 === cat || cat === '전체') {
      onFilterChange({
        ...filterState,
        category1: '전체',
        category2: '전체',
        category3: '전체',
      });
    } else {
      const details = cat1ToDetailsMap[cat];
      onFilterChange({
        ...filterState,
        category1: cat,
        category2: '전체',
        category3: '전체',
        lifecycle: details?.lifecycle || filterState.lifecycle,
      });
    }
  };

  // 2차 중분류 클릭 핸들러 (상위 1차 대분류 & 생애주기 자동 연동 동기화!)
  const handleCat2Click = (sub: string) => {
    if (filterState.category2 === sub || sub === '전체') {
      onFilterChange({
        ...filterState,
        category2: '전체',
        category3: '전체',
      });
    } else {
      // 선택한 중분류의 부모 대분류와 생애주기를 자동으로 찾아 즉시 동기화!
      const parents = subToParentsMap[sub];
      const targetCat1 = parents ? parents.cat1 : filterState.category1;
      const targetLifecycle = parents ? parents.lifecycle : filterState.lifecycle;

      onFilterChange({
        ...filterState,
        category1: targetCat1,
        category2: sub,
        category3: '전체',
        lifecycle: targetLifecycle,
      });
    }
  };

  // 3차 세분류 클릭 핸들러
  const handleCat3Click = (micro: string) => {
    if (filterState.category3 === micro || micro === '전체') {
      onFilterChange({
        ...filterState,
        category3: '전체',
      });
    } else {
      onFilterChange({
        ...filterState,
        category3: micro,
      });
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900">다차원 계층 연동 딥 필터바</h4>
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              {activeFilterCount}개 필터 상호 연동 중
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-red-600 font-bold underline cursor-pointer"
          >
            필터 전체 초기화
          </button>
        )}
      </div>

      {/* 1. 제안 연도 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-100">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>제안 연도</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {Object.entries(yearCounts).map(([yr, count]) => {
            const isSelected = filterState.year === yr;
            return (
              <button
                key={yr}
                onClick={() => onFilterChange({ ...filterState, year: yr })}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {yr === '2026' ? `🔥 2026 최신 (${count}건)` : `${yr} (${count}건)`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 생애주기 (정책흐름) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-100">
          <Heart className="w-3.5 h-3.5 text-blue-600" />
          <span>생애주기</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {Object.entries(lifecycleCounts).map(([lf, count]) => {
            const isSelected = filterState.lifecycle === lf;
            return (
              <button
                key={lf}
                onClick={() => handleLifecycleClick(lf)}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lf} ({count}건)
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 1차 대분류 (중분류 선택 시 부모 대분류 자동 선택 동기화) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <span>1차 대분류</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {Object.entries(cat1Counts).map(([cat, count]) => {
            const isSelected = filterState.category1 === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCat1Click(cat)}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] flex items-center gap-1 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isSelected && cat !== '전체' && <Link2 className="w-3 h-3 text-emerald-400" />}
                <span>{cat} ({count}건)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 2차 중분류 (1차 대분류 선택 시 해당 대분류 연관 중분류만 노출, 클릭 시 상위 대분류 자동 연동!) */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1 border-t border-slate-100 bg-indigo-50/20 p-2 rounded-xl">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 mt-0.5">
          <GitBranch className="w-3.5 h-3.5 text-indigo-700" />
          <span>2차 중분류</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1 max-h-32 overflow-y-auto pr-1">
          {Object.entries(cat2Counts).map(([sub, count]) => {
            const isSelected = filterState.category2 === sub;
            return (
              <button
                key={sub}
                onClick={() => handleCat2Click(sub)}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-100'
                }`}
                title={sub !== '전체' && subToParentsMap[sub] ? `상위 1차 대분류: ${subToParentsMap[sub].cat1}` : ''}
              >
                {sub} ({count}건)
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 3차 세분류 (중분류 선택 시 딥 세분류 칩 노출) */}
      {filterState.category2 !== '전체' && Object.keys(cat3Counts).length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
          <div className="w-24 shrink-0 font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-200 px-2.5 py-1 rounded-md border border-emerald-300">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span>3차 세분류</span>
          </div>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {Object.entries(cat3Counts).map(([micro, count]) => {
              const isSelected = filterState.category3 === micro;
              return (
                <button
                  key={micro}
                  onClick={() => handleCat3Click(micro)}
                  className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {micro} ({count}건)
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. 담당부서 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-slate-100">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-purple-50/80 px-2.5 py-1 rounded-md border border-purple-100">
          <Building className="w-3.5 h-3.5 text-purple-600" />
          <span>담당부서</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1 max-h-24 overflow-y-auto pr-1">
          {Object.entries(deptCounts).slice(0, 15).map(([dept, count]) => {
            const isSelected = filterState.department === dept;
            return (
              <button
                key={dept}
                onClick={() => onFilterChange({ ...filterState, department: dept })}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                }`}
              >
                {dept} ({count}건)
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
