import React, { useMemo } from 'react';
import { PolicyProposal } from '../types';
import { Calendar, Heart, Layers, GitBranch, Filter, Building, Link2, Sparkles, Sprout } from 'lucide-react';

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

// 100% 하드코딩 정밀 룩업 매핑 (2차 중분류 ➔ 1차 대분류 & 생애주기)
export const SUB_TO_PARENT_MAP: Record<string, { cat1: string; lifecycle: string }> = {
  // JSON 실측 데이터 매핑
  "출산가구 주거": { cat1: "주거·교통·도시생활환경", lifecycle: "도시생활 기반" },
  "양육지원 서비스 접근성": { cat1: "정보·상담·교육·거버넌스", lifecycle: "공통 행정·정보" },
  "임산부 건강·배려": { cat1: "임신·난임·생식건강", lifecycle: "임신 전·임신 중" },
  "정보 접근성": { cat1: "정보·상담·교육·거버넌스", lifecycle: "공통 행정·정보" },
  "초등돌봄": { cat1: "보육·돌봄 인프라", lifecycle: "영유아·초등 돌봄" },
  "출산가구 초기지원": { cat1: "출산·산후 초기지원", lifecycle: "출산 직후" },
  "다자녀 혜택": { cat1: "다자녀·양육비·생활지원", lifecycle: "양육기 생활지원" },
  "아동 놀이·체험공간": { cat1: "보육·돌봄 인프라", lifecycle: "영유아·초등 돌봄" },
  "난임 지원": { cat1: "임신·난임·생식건강", lifecycle: "임신 전·임신 중" },
  "아동 건강·의료 접근성": { cat1: "보육·돌봄 인프라", lifecycle: "영유아·초등 돌봄" },
  "어린이집·유치원": { cat1: "보육·돌봄 인프라", lifecycle: "영유아·초등 돌봄" },
  "가족돌봄": { cat1: "보육·돌봄 인프라", lifecycle: "영유아·초등 돌봄" },
  "유모차 이동권": { cat1: "주거·교통·도시생활환경", lifecycle: "도시생활 기반" },
  "부모·가족 교육/상담": { cat1: "정보·상담·교육·거버넌스", lifecycle: "공통 행정·정보" },
  "산모 회복·건강관리": { cat1: "출산·산후 초기지원", lifecycle: "출산 직후" },
  "임신 준비·가임력 지원": { cat1: "임신·난임·생식건강", lifecycle: "임신 전·임신 중" },
  "한부모·위기임산부": { cat1: "취약·다양가족 사각지대", lifecycle: "사각지대 보호" },
  "양육비·생활비 지원": { cat1: "다자녀·양육비·생활지원", lifecycle: "양육기 생활지원" },
  "산후조리": { cat1: "출산·산후 초기지원", lifecycle: "출산 직후" },
  "육아휴직·근로시간": { cat1: "일·가정 양립·부모 노동", lifecycle: "부모 노동·돌봄 병행" },
  "유연근무·재택근무": { cat1: "일·가정 양립·부모 노동", lifecycle: "부모 노동·돌봄 병행" },

  // 기존 룩업 호환용 여분 키 매핑
  '임산부 건강검사·배려': { cat1: '임신·난임·생식건강', lifecycle: '임신 전·임신 중' },
  '난임 시술비·횟수·나이 제한': { cat1: '임신·난임·생식건강', lifecycle: '임신 전·임신 중' },
  '난임 주사·보건소 접근성': { cat1: '임신·난임·생식건강', lifecycle: '임신 전·임신 중' },
  '출산지원금·장려금': { cat1: '출산·산후 초기지원', lifecycle: '출산 직후' },
  '출생축하·신생아 초기지원': { cat1: '출산·산후 초기지원', lifecycle: '출산 직후' },
  '산후조리·도우미': { cat1: '출산·산후 초기지원', lifecycle: '출산 직후' },
  '초등돌봄·방과후·키움센터': { cat1: '보육·돌봄 인프라', lifecycle: '영유아·초등 돌봄' },
  '아이돌봄·조부모·베이비시터': { cat1: '보육·돌봄 인프라', lifecycle: '영유아·초등 돌봄' },
  '야간·주말·긴급보육': { cat1: '보육·돌봄 인프라', lifecycle: '영유아·초등 돌봄' },
  '다자녀 기준·혜택': { cat1: '다자녀·양육비·생활지원', lifecycle: '양육기 생활지원' },
  '교육비·서울런': { cat1: '다자녀·양육비·생활지원', lifecycle: '양육기 생활지원' },
  '생활비·공공요금·문화비': { cat1: '다자녀·양육비·생활지원', lifecycle: '양육기 생활지원' },
  '출산가구·신혼부부 주거지원': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '무주택·월세·주거비': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '유모차·교통 접근성': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '임산부 이동권': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '임산부·영유아 이동권': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '공공시설·생활편의': { cat1: '주거·교통·도시생활환경', lifecycle: '도시생활 기반' },
  '육아휴직·출산휴가': { cat1: '일·가정 양립·부모 노동', lifecycle: '부모 노동·돌봄 병행' },
  '근로시간 단축': { cat1: '일·가정 양립·부모 노동', lifecycle: '부모 노동·돌봄 병행' },
  '자영업·프리랜서·야간근무': { cat1: '일·가정 양립·부모 노동', lifecycle: '부모 노동·돌봄 병행' },
  '경력단절·자립': { cat1: '일·가정 양립·부모 노동', lifecycle: '부모 노동·돌봄 병행' },
  '한부모·미혼모/부': { cat1: '취약·다양가족 사각지대', lifecycle: '사각지대 보호' },
  '다문화·외국인': { cat1: '취약·다양가족 사각지대', lifecycle: '사각지대 보호' },
  '저소득·차상위·입양': { cat1: '취약·다양가족 사각지대', lifecycle: '사각지대 보호' },
  '정보 통합·앱·플랫폼': { cat1: '정보·상담·교육·거버넌스', lifecycle: '공통 행정·정보' },
  '상담·매칭': { cat1: '정보·상담·교육·거버넌스', lifecycle: '공통 행정·정보' },
  '부모교육·아빠교육': { cat1: '정보·상담·교육·거버넌스', lifecycle: '공통 행정·정보' },
  '성평등·인식개선': { cat1: '정보·상담·교육·거버넌스', lifecycle: '공통 행정·정보' },
  '신청·서류·기준 개선': { cat1: '정보·상담·교육·거버넌스', lifecycle: '공통 행정·정보' },
};

export const CAT1_TO_LIFECYCLE: Record<string, string> = {
  '임신·난임·생식건강': '임신 전·임신 중',
  '출산·산후 초기지원': '출산 직후',
  '보육·돌봄 인프라': '영유아·초등 돌봄',
  '다자녀·양육비·생활지원': '양육기 생활지원',
  '주거·교통·도시생활환경': '도시생활 기반',
  '일·가정 양립·부모 노동': '부모 노동·돌봄 병행',
  '취약·다양가족 사각지대': '사각지대 보호',
  '정보·상담·교육·거버넌스': '공통 행정·정보',
};

export const LIFECYCLE_TO_CAT1: Record<string, string> = {
  '임신 전·임신 중': '임신·난임·생식건강',
  '출산 직후': '출산·산후 초기지원',
  '영유아·초등 돌봄': '보육·돌봄 인프라',
  '양육기 생활지원': '다자녀·양육비·생활지원',
  '도시생활 기반': '주거·교통·도시생활환경',
  '부모 노동·돌봄 병행': '일·가정 양립·부모 노동',
  '사각지대 보호': '취약·다양가족 사각지대',
  '공통 행정·정보': '정보·상담·교육·거버넌스',
};

export const MultiTierCategoryFilter: React.FC<Props> = ({
  proposals,
  filterState,
  onFilterChange,
}) => {
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

  // 3. 1차 대분류 목록 및 수량 (생애주기 선택 시 해당 생애주기 내 대분류만)
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

  // 4. 2차 중분류 목록 및 수량 (1차 대분류가 선택되어 있으면 해당 대분류 소속 중분류만 좁혀서 렌더링!)
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

  // 5. 3차 세분류 목록 및 수량 (2차 중분류 선택 시 해당 중분류 소속 세분류만 좁혀서 렌더링!)
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

  // 생애주기 클릭 핸들러 (1차 대분류 자동 선택 동기화)
  const handleLifecycleClick = (lf: string) => {
    if (lf === '전체' || filterState.lifecycle === lf) {
      onFilterChange({
        ...filterState,
        lifecycle: '전체',
        category1: '전체',
        category2: '전체',
        category3: '전체',
      });
    } else {
      const targetCat1 = LIFECYCLE_TO_CAT1[lf] || '전체';
      onFilterChange({
        ...filterState,
        lifecycle: lf,
        category1: targetCat1,
        category2: '전체',
        category3: '전체',
      });
    }
  };

  // 1차 대분류 클릭 핸들러 (전체 선택 시 생애주기도 함께 '전체'로 동기화 리셋)
  const handleCat1Click = (cat: string) => {
    if (cat === '전체' || filterState.category1 === cat) {
      onFilterChange({
        ...filterState,
        lifecycle: '전체',
        category1: '전체',
        category2: '전체',
        category3: '전체',
      });
    } else {
      const targetLifecycle = CAT1_TO_LIFECYCLE[cat] || filterState.lifecycle;
      onFilterChange({
        ...filterState,
        category1: cat,
        category2: '전체',
        category3: '전체',
        lifecycle: targetLifecycle,
      });
    }
  };

  // 2차 중분류 클릭 핸들러 (상위 1차 대분류 & 생애주기 100% 즉시 자동 동기화!)
  const handleCat2Click = (sub: string) => {
    if (sub === '전체' || filterState.category2 === sub) {
      onFilterChange({
        ...filterState,
        category2: '전체',
        category3: '전체',
      });
    } else {
      const parent = SUB_TO_PARENT_MAP[sub];
      onFilterChange({
        ...filterState,
        category1: parent ? parent.cat1 : filterState.category1,
        category2: sub,
        category3: '전체',
        lifecycle: parent ? parent.lifecycle : filterState.lifecycle,
      });
    }
  };

  // 3차 세분류 클릭 핸들러
  const handleCat3Click = (micro: string) => {
    if (micro === '전체' || filterState.category3 === micro) {
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
          <h4 className="text-sm font-bold text-slate-900">다차원 계층 양방향 자동연동 딥 필터바</h4>
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              {activeFilterCount}개 필터 상호 완벽 연동 중
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
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-2 text-[11px]">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>제안 연도</span>
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {['전체년', '2026', '2025', '2024', '2023', '2022이전'].map((yr) => {
            const count = yearCounts[yr] || 0;
            const isSelected = filterState.year === yr;
            const is2026 = yr === '2026';
            const badgeStyle = isSelected
              ? (is2026 ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs')
              : (is2026 ? 'bg-emerald-50/20 text-emerald-600 border-emerald-200 hover:bg-emerald-50/40' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50');
            return (
              <button
                key={yr}
                onClick={() => onFilterChange({ ...filterState, year: yr })}
                className={`px-2.5 py-1 rounded-full border transition font-bold cursor-pointer text-[11px] ${badgeStyle}`}
              >
                {yr === '2026' ? `🔥 2026 최신 (${count}건)` : `${yr} (${count}건)`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 생애주기 (정책흐름) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center gap-2 text-[11px]">
          <Sprout className="w-4 h-4 text-green-600" />
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
                    ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs font-extrabold'
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
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center text-[11px]">
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
                    ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs font-extrabold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isSelected && cat !== '전체' && <Link2 className="w-3 h-3 text-emerald-400" />}
                <span>{cat} ({count}건)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 2차 중분류 (1차 대분류 선택 시 해당 대분류 연관 중분류만 좁혀 노출, 클릭 시 상위 대분류 자동 연동!) */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1 border-t border-slate-100">
        <div className="w-24 shrink-0 font-bold text-slate-500 flex items-center pl-3 pt-0.5 text-[11px]">
          <span>ㄴ 2차 중분류</span>
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
                    ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs font-extrabold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={sub !== '전체' && SUB_TO_PARENT_MAP[sub] ? `상위 1차 대분류: ${SUB_TO_PARENT_MAP[sub].cat1}` : ''}
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
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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
        <div className="w-24 shrink-0 font-bold text-slate-700 flex items-center text-[11px]">
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
                    ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs font-extrabold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
