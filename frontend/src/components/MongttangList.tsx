import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  ExternalLink, 
  Phone, 
  Users, 
  FileText, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Bookmark,
  Layers
} from 'lucide-react';
import rawMongttangData from '../data/mongttang.json';
import summaryData from '../data/dashboard_summary.json';
import { MongttangPolicy } from '../types';

export const MongttangList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<MongttangPolicy | null>(null);

  // JSON 데이터 및 대분류/중분류 카테고리 통합/가공
  const policies: MongttangPolicy[] = useMemo(() => {
    if (rawMongttangData && Array.isArray((rawMongttangData as any).DATA)) {
      const list = (rawMongttangData as any).DATA as MongttangPolicy[];
      return list.map(p => {
        let displayCategory = p.biz_lclsf_nm || '기타';
        const mclsf = p.biz_mclsf_nm || '';
        const bizNm = p.biz_nm || '';
        const target = p.utztn_trpr_cn || '';

        // 1. 청년 1인가구 / 청년 자립 관련 ➔ [청년] (우선순위 상향 조정)
        if (
          mclsf.includes('청년') || 
          bizNm.includes('청년') || 
          target.includes('청년') ||
          target.includes('1인가구') ||
          bizNm.includes('1인가구')
        ) {
          displayCategory = '청년';
        }
        // 2. (예비)신혼부부 / 결혼 관련 ➔ [신혼부부]
        else if (
          displayCategory.includes('신혼부부') || 
          displayCategory.includes('결혼') ||
          mclsf.includes('결혼') || 
          mclsf.includes('신혼') ||
          bizNm.includes('신혼')
        ) {
          displayCategory = '신혼부부';
        } 
        // 3. 임신 / 임신준비 / 난임 관련 통합 ➔ [임신·준비]
        else if (
          displayCategory.includes('임신') ||
          mclsf.includes('임신') ||
          mclsf.includes('난임')
        ) {
          displayCategory = '임신·준비';
        }
        // 4. 육아 / 양육 / 보육 / 안심돌봄 통합 ➔ [육아·보육]
        else if (
          displayCategory.includes('육아') ||
          displayCategory.includes('양육') ||
          displayCategory.includes('안심돌봄') ||
          mclsf.includes('돌봄') ||
          mclsf.includes('보육')
        ) {
          displayCategory = '육아·보육';
        }
        // 5. 일생활균형 표기 정돈
        else if (displayCategory.includes('일생활균형')) {
          displayCategory = '일·생활균형';
        }

        // 대분류별 세부 중분류 태그 정제
        let displaySubCategory = p.biz_mclsf_nm || '일반지원';
        if (displayCategory === '육아·보육') {
          if (mclsf.includes('교육') || bizNm.includes('교육') || bizNm.includes('학습')) displaySubCategory = '교육지원';
          else if (mclsf.includes('돌봄') || mclsf.includes('보육') || bizNm.includes('어린이집') || bizNm.includes('돌봄') || bizNm.includes('키움')) displaySubCategory = '돌봄·시설';
          else if (mclsf.includes('건강') || bizNm.includes('건강') || bizNm.includes('의료') || bizNm.includes('간호')) displaySubCategory = '건강지원';
          else displaySubCategory = '생활·수당';
        } else if (displayCategory === '임신·준비') {
          if (mclsf.includes('난임') || bizNm.includes('난임')) displaySubCategory = '난임 부부지원';
          else if (mclsf.includes('임산부') || bizNm.includes('산모') || bizNm.includes('임산부') || bizNm.includes('산후')) displaySubCategory = '임산부 케어';
          else displaySubCategory = '건강·스마트케어';
        } else if (displayCategory === '출산') {
          if (mclsf.includes('수유') || bizNm.includes('수유') || bizNm.includes('우울')) displaySubCategory = '수유·산후케어';
          else if (bizNm.includes('축하') || bizNm.includes('물품') || bizNm.includes('첫걸음')) displaySubCategory = '축하물품·가정방문';
          else displaySubCategory = '출산·기업지원';
        } else if (displayCategory === '신혼부부') {
          if (mclsf.includes('결혼') || bizNm.includes('결혼') || bizNm.includes('주거')) displaySubCategory = '결혼·주거지원';
          else displaySubCategory = '가정형성 지원';
        } else if (displayCategory === '청년') {
          if (bizNm.includes('밥상') || bizNm.includes('소셜다이닝')) displaySubCategory = '식생활·자립';
          else displaySubCategory = '취업·역량강화';
        } else if (displayCategory === '일·생활균형') {
          if (mclsf.includes('경력') || bizNm.includes('우먼업')) displaySubCategory = '경력보유여성 지원';
          else displaySubCategory = '기업문화·워라밸';
        } else if (displayCategory === '편한외출') {
          if (bizNm.includes('오케이존') || bizNm.includes('서울광장')) displaySubCategory = '외출·문화공간';
          else displaySubCategory = '이동·교통배려';
        }

        return {
          ...p,
          displayCategory,
          displaySubCategory
        };
      });
    }
    return [];
  }, []);

  // 대분류 목록 추출 (건수 많은 순서 내림차순 정렬)
  const categories = useMemo(() => {
    const countMap: Record<string, number> = {};
    policies.forEach(p => {
      if (p.displayCategory) {
        countMap[p.displayCategory] = (countMap[p.displayCategory] || 0) + 1;
      }
    });

    const sortedCats = Object.keys(countMap).sort((a, b) => countMap[b] - countMap[a]);
    return ['전체', ...sortedCats];
  }, [policies]);

  // 대분류별 중분류 목록 및 건수 계산
  const subCategoriesMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    policies.forEach(p => {
      const cat = p.displayCategory;
      const subCat = p.displaySubCategory;
      if (cat && subCat) {
        if (!map[cat]) map[cat] = {};
        map[cat][subCat] = (map[cat][subCat] || 0) + 1;
      }
    });
    return map;
  }, [policies]);

  // 필터링된 정책 목록 (대분류 + 중분류 + 검색어)
  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const matchCategory = selectedCategory === '전체' || p.displayCategory === selectedCategory;
      const matchSubCategory = !selectedSubCategory || p.displaySubCategory === selectedSubCategory;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch = !term || 
        (p.biz_nm && p.biz_nm.toLowerCase().includes(term)) ||
        (p.biz_cn && p.biz_cn.toLowerCase().includes(term)) ||
        (p.utztn_trpr_cn && p.utztn_trpr_cn.toLowerCase().includes(term)) ||
        (p.biz_mclsf_nm && p.biz_mclsf_nm.toLowerCase().includes(term));
      
      return matchCategory && matchSubCategory && matchSearch;
    });
  }, [policies, selectedCategory, selectedSubCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 슬림 & 직관형 상단 타이틀 Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-indigo-800/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 flex items-center pr-6 pointer-events-none">
          <Building2 className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 타이틀 및 핵심 헤드라인 */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-blue-400" />
                서울시 공식 출산·육아 정책 (몽땅정보 만능키 DB 100% 연동)
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              서울시 출산·양육 정책 수요 분석 시스템
            </h2>
          </div>

          {/* 한눈에 들어오는 직관적 4개 동일 규격 수치 박스 (가운데 정렬) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            {/* 박스 1: 총 시행 정책 */}
            <div className="bg-white/20 backdrop-blur-md border border-white/35 rounded-xl px-3 py-2 min-w-[100px] shadow-2xs flex flex-col justify-center text-center">
              <span className="text-xs sm:text-sm text-white font-black leading-snug flex items-center gap-1 justify-center">🏛️ 총 시행 정책</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200 leading-tight font-mono mt-0.5 block text-center">{policies.length}<span className="text-[10px] font-normal text-slate-300 ml-0.5">건</span></span>
            </div>

            {/* 박스 2: 육아·보육 */}
            <div className="bg-emerald-500/30 backdrop-blur-md border border-emerald-300/50 rounded-xl px-3 py-2 min-w-[100px] shadow-2xs flex flex-col justify-center text-center">
              <span className="text-xs sm:text-sm text-emerald-100 font-black leading-snug flex items-center gap-1 justify-center">🍼 육아·보육</span>
              <span className="text-[11px] sm:text-xs font-bold text-emerald-200 leading-tight font-mono mt-0.5 block text-center">{policies.filter(p => p.displayCategory === '육아·보육').length}<span className="text-[10px] font-normal text-emerald-100/90 ml-0.5">건</span></span>
            </div>

            {/* 박스 3: 임신·출산 */}
            <div className="bg-sky-500/30 backdrop-blur-md border border-sky-300/50 rounded-xl px-3 py-2 min-w-[100px] shadow-2xs flex flex-col justify-center text-center">
              <span className="text-xs sm:text-sm text-sky-100 font-black leading-snug flex items-center gap-1 justify-center">🤰 임신·출산</span>
              <span className="text-[11px] sm:text-xs font-bold text-sky-200 leading-tight font-mono mt-0.5 block text-center">{policies.filter(p => p.displayCategory === '임신·준비' || p.displayCategory === '출산').length}<span className="text-[10px] font-normal text-sky-100/90 ml-0.5">건</span></span>
            </div>

            {/* 박스 4: 신혼부부·청년 */}
            <div className="bg-amber-500/30 backdrop-blur-md border border-amber-300/50 rounded-xl px-3 py-2 min-w-[100px] shadow-2xs flex flex-col justify-center text-center">
              <span className="text-xs sm:text-sm text-amber-100 font-black leading-snug flex items-center gap-1 justify-center">💍 신혼부부·청년</span>
              <span className="text-[11px] sm:text-xs font-bold text-amber-200 leading-tight font-mono mt-0.5 block text-center">{policies.filter(p => p.displayCategory === '신혼부부' || p.displayCategory === '청년').length}<span className="text-[10px] font-normal text-amber-100/90 ml-0.5">건</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 2열 레이아웃: 좌측 계층형 아코디언 목차 + 우측 메인 콘텐츠 */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* 좌측: 계층형 토글 스티키 목차 사이드바 */}
        <aside className="w-full md:w-56 shrink-0 bg-white rounded-xl p-3 shadow-2xs border border-slate-200 md:sticky md:top-24 space-y-1.5 z-20">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-black text-slate-800 tracking-tight">정책 분류 목차</span>
            </div>
            {selectedSubCategory && (
              <button
                onClick={() => setSelectedSubCategory(null)}
                className="text-[10px] text-blue-600 hover:underline font-bold"
              >
                필터 초기화
              </button>
            )}
          </div>

          <nav className="space-y-1 text-xs font-semibold">
            {categories.map((cat) => {
              const count = cat === '전체' ? policies.length : policies.filter(p => p.displayCategory === cat).length;
              const isSelected = selectedCategory === cat;
              const isOpen = openAccordion === cat;
              const subMap = subCategoriesMap[cat];
              const hasSub = cat !== '전체' && subMap && Object.keys(subMap).length > 0;

              return (
                <div key={cat} className="space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedSubCategory(null);
                      if (hasSub) {
                        setOpenAccordion(isOpen ? null : cat);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {hasSub ? (
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-90 text-white' : 'text-slate-400'}`} />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full ml-1 font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {/* 부드러운 스르륵 토글 애니메이션 하위 중분류 목록 */}
                  {hasSub && (
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100 mt-1 mb-1' : 'max-h-0 opacity-0 my-0 pointer-events-none'
                    }`}>
                      <div className="pl-3.5 pr-1 py-0.5 space-y-0.5 border-l-2 border-blue-300 ml-3.5">
                        {/* 세부 중분류 태그 리스트 */}
                        {Object.entries(subMap).map(([subCat, subCount]) => {
                          const isSubSelected = isSelected && selectedSubCategory === subCat;
                          return (
                            <button
                              key={subCat}
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSelectedSubCategory(subCat);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition text-left ${
                                isSubSelected
                                  ? 'bg-blue-100 text-blue-900 font-extrabold border border-blue-300 shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <span className="truncate">↳ {subCat}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                isSubSelected ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {subCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* 우측 메인 영역: 넓게 확보된 검색창 및 정책 카드 목록 */}
        <main className="flex-grow min-w-0 w-full space-y-4">
          {/* 중앙 검색 바 */}
          <div className="bg-white rounded-xl p-3.5 shadow-2xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="정책명, 지원 대상, 상세 내용으로 검색하세요..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>검색 결과: <strong className="text-blue-600 font-black">{filteredPolicies.length}</strong>건</span>
            </div>
          </div>

          {/* 정책 카드 그리드 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPolicies.map((policy, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition duration-200 flex flex-col justify-between p-4 cursor-pointer group"
                onClick={() => setSelectedPolicy(policy)}
              >
                <div className="space-y-2.5">
                  {/* 상단 뱃지 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-md">
                      {policy.displayCategory || policy.biz_lclsf_nm || '전체'}
                    </span>
                    {policy.displaySubCategory && (
                      <span className="text-[11px] text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        {policy.displaySubCategory}
                      </span>
                    )}
                  </div>

                  {/* 사업명 */}
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm leading-snug line-clamp-2">
                    {policy.biz_nm}
                  </h3>

                  {/* 사업 내용 요약 */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {policy.biz_cn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {/* 지원 대상 */}
                  {policy.utztn_trpr_cn && (
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{policy.utztn_trpr_cn}</span>
                    </div>
                  )}

                  {/* 문의처 */}
                  {policy.aref_cn && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{policy.aref_cn}</span>
                    </div>
                  )}

                  {/* 상세 보기 버튼 */}
                  <div className="flex items-center justify-between pt-1 text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition">
                    <span>상세 내용 보기</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}

            {filteredPolicies.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-bold">조건에 해당하는 서울시 정책이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">검색어나 카테고리 필터를 변경해보세요.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 정책 상세 보기 모달 */}
      {selectedPolicy && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPolicy(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {selectedPolicy.displayCategory || selectedPolicy.biz_lclsf_nm}
                  </span>
                  {selectedPolicy.biz_mclsf_nm && selectedPolicy.biz_mclsf_nm !== selectedPolicy.displayCategory && (
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedPolicy.biz_mclsf_nm}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  {selectedPolicy.biz_nm}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 정보 */}
            <div className="space-y-4 text-xs text-slate-700">
              {/* 주요 상세 내용 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <Bookmark className="w-4 h-4 text-blue-600" />
                  사업 상세 내용
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedPolicy.biz_cn}
                </p>
              </div>

              {/* 이용 대상 및 신청 방법 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPolicy.utztn_trpr_cn && (
                  <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 space-y-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1 text-xs">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      지원 대상
                    </span>
                    <p className="text-slate-800 leading-normal">{selectedPolicy.utztn_trpr_cn}</p>
                  </div>
                )}

                {selectedPolicy.utztn_mthd_cn && (
                  <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100 space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      신청 / 이용 방법
                    </span>
                    <p className="text-slate-800 leading-normal">{selectedPolicy.utztn_mthd_cn}</p>
                  </div>
                )}
              </div>

              {/* 기타 정보: 대상지역, 문의처 */}
              <div className="space-y-2 border-t border-slate-100 pt-3 text-slate-600">
                {selectedPolicy.aref_cn && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>문의처:</strong> {selectedPolicy.aref_cn}</span>
                  </div>
                )}
                {selectedPolicy.trgt_rgn && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>지원 지역:</strong> {selectedPolicy.trgt_rgn}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 버튼 */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
              {selectedPolicy.aply_site_addr && selectedPolicy.aply_site_addr !== '.' && (
                <a
                  href={selectedPolicy.aply_site_addr.startsWith('http') ? selectedPolicy.aply_site_addr : `https://${selectedPolicy.aply_site_addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  몽땅정보만능키 신청 사이트 이동
                </a>
              )}
              <button
                onClick={() => setSelectedPolicy(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
