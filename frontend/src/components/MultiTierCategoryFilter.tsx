import React, { useMemo } from 'react';
import { PolicyProposal } from '../types';
import { Calendar, Heart, Layers, GitBranch, Filter, Building, Link2 } from 'lucide-react';

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

export const MultiTierCategoryFilter: React.FC<Props> = ({
  proposals,
  filterState,
  onFilterChange,
}) => {
  // 0. 계층간 역방향 / 정방향 자동 상위-하위 룩업 맵 구축
  const subToCat1Map = useMemo(() => {
    const map: Record<string, string> = {};
    proposals.forEach(p => {
      if (p.sub_category && p.category) {
        map[p.sub_category] = p.category;
      }
    });
    return map;
  }, [proposals]);

  const microToParentsMap = useMemo(() => {
    const map: Record<string, { cat2: string; cat1: string }> = {};
    proposals.forEach(p => {
      if (p.micro_category && p.sub_category && p.category) {
        map[p.micro_category] = { cat2: p.sub_category, cat1: p.category };
      }
    });
    return map;
  }, [proposals]);

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

  // 2. 생애주기 목록 및 수량
  const lifecycleCounts = useMemo(() => {
    const map: Record<string, number> = { 전체: proposals.length };
    proposals.forEach(p => {
      const flow = p.policy_flow || '기타';
      map[flow] = (map[flow] || 0) + 1;
    });
    return map;
  }, [proposals]);

  // 3. 1차 대분류 목록 및 수량
  const cat1Counts = useMemo(() => {
    const map: Record<string, number> = { 전체: proposals.length };
    proposals.forEach(p => {
      const cat = p.category || '기타';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [proposals]);

  // 4. 2차 중분류 목록 및 수량 (선택된 1차 대분류가 있으면 해당 대분류 내 중분류만)
  const cat2Counts = useMemo(() => {
    const baseList = filterState.category1 === '전체' 
      ? proposals 
      : proposals.filter(p => p.category === filterState.category1);

    const map: Record<string, number> = { 전체: baseList.length };
    baseList.forEach(p => {
      const sub = p.sub_category || '기타';
      map[sub] = (map[sub] || 0) + 1;
    });
    return map;
  }, [proposals, filterState.category1]);

  // 5. 3차 세분류 목록 및 수량 (선택된 2차 중분류가 있으면 해당 중분류 내 세분류만)
  const cat3Counts = useMemo(() => {
    const baseList = filterState.category2 === '전체'
      ? (filterState.category1 === '전체' ? proposals : proposals.filter(p => p.category === filterState.category1))
      : proposals.filter(p => p.sub_category === filterState.category2);

    const map: Record<string, number> = { 전체: baseList.length };
    baseList.forEach(p => {
      const micro = p.micro_category || p.title || '기타';
      map[micro] = (map[micro] || 0) + 1;
    });
    return map;
  }, [proposals, filterState.category1, filterState.category2]);

  // 6. 담당부서 목록 및 수량
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

  // 1차 대분류 클릭 핸들러
  const handleCat1Click = (cat: string) => {
    if (filterState.category1 === cat) {
      // 해제
      onFilterChange({
        ...filterState,
        category1: '전체',
        category2: '전체',
        category3: '전체',
      });
    } else {
      // 신규 선택
      onFilterChange({
        ...filterState,
        category1: cat,
        category2: '전체',
        category3: '전체',
      });
    }
  };

  // 2차 중분류 클릭 핸들러 (상위 1차 대분류 자동 동기화!)
  const handleCat2Click = (sub: string) => {
    if (filterState.category2 === sub) {
      // 해제 (1차 대분류는 유지)
      onFilterChange({
        ...filterState,
        category2: '전체',
        category3: '전체',
      });
    } else if (sub === '전체') {
      onFilterChange({
        ...filterState,
        category2: '전체',
        category3: '전체',
      });
    } else {
      // 신규 선택: 해당 중분류가 속한 상위 1차 대분류 자동 룩업 및 선택!
      const parentCat1 = subToCat1Map[sub] || filterState.category1;
      onFilterChange({
        ...filterState,
        category1: parentCat1,
        category2: sub,
        category3: '전체',
      });
    }
  };

  // 3차 세분류 클릭 핸들러 (상위 2차 중분류 & 1차 대분류 자동 동기화!)
  const handleCat3Click = (micro: string) => {
    if (filterState.category3 === micro) {
      onFilterChange({
        ...filterState,
        category3: '전체',
      });
    } else if (micro === '전체') {
      onFilterChange({
        ...filterState,
        category3: '전체',
      });
    } else {
      const parents = microToParentsMap[micro];
      onFilterChange({
        ...filterState,
        category1: parents?.cat1 || filterState.category1,
        category2: parents?.cat2 || filterState.category2,
        category3: micro,
      });
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900">다차원 분류체계 딥 필터링</h4>
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {activeFilterCount}개 필터 적용 중
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
                onClick={() => onFilterChange({ ...filterState, lifecycle: lf })}
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

      {/* 3. 1차 대분류 (상위계층 연동 강조 표시) */}
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
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-300'
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

      {/* 4. 2차 중분류 (클릭 시 상위 1차 대분류 자동 선택 동기화) */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1 border-t border-slate-100">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100 mt-0.5">
          <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
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
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                }`}
                title={sub !== '전체' && subToCat1Map[sub] ? `상위 1차 대분류: ${subToCat1Map[sub]}` : ''}
              >
                {sub} ({count}건)
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 3차 세분류 (선택된 중분류에 따른 딥 브랜치 및 동기화) */}
      {filterState.category2 !== '전체' && Object.keys(cat3Counts).length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
          <div className="w-24 shrink-0 font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
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

