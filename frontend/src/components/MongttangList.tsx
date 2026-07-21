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
  const [selectedPolicy, setSelectedPolicy] = useState<MongttangPolicy | null>(null);

  // JSON 구조에서 DATA 추출 (mongttang.json -> { DESCRIPTION: ..., DATA: [...] })
  const policies: MongttangPolicy[] = useMemo(() => {
    if (rawMongttangData && Array.isArray((rawMongttangData as any).DATA)) {
      return (rawMongttangData as any).DATA as MongttangPolicy[];
    }
    return [];
  }, []);

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const set = new Set<string>();
    policies.forEach(p => {
      if (p.biz_lclsf_nm) set.add(p.biz_lclsf_nm);
    });
    return ['전체', ...Array.from(set)];
  }, [policies]);

  // 필터링된 정책 목록
  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const matchCategory = selectedCategory === '전체' || p.biz_lclsf_nm === selectedCategory;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch = !term || 
        (p.biz_nm && p.biz_nm.toLowerCase().includes(term)) ||
        (p.biz_cn && p.biz_cn.toLowerCase().includes(term)) ||
        (p.utztn_trpr_cn && p.utztn_trpr_cn.toLowerCase().includes(term));
      
      return matchCategory && matchSearch;
    });
  }, [policies, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Building2 className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              서울시 공식 시행 사업 (몽땅정보 만능키)
            </span>
            <span className="text-xs text-blue-200">총 {summaryData.total_policy_count || policies.length}건 등록</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            🏛️ 서울시 현행 출산·육아 정책 현황
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            서울시가 현재 시민들에게 실제로 제공하고 있는 공식 출산·육아 지원 정책 목록입니다. 
            시민 요구 민원과 본 정책 목록을 대조하여 <strong className="text-amber-300">‘진짜 정책 공백’</strong>을 분석하고 개선 우선순위를 도출합니다.
          </p>

          {/* 주요 통계 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3">
              <p className="text-xs text-slate-300">총 시행 정책</p>
              <p className="text-xl font-bold text-white mt-0.5">{policies.length}건</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3">
              <p className="text-xs text-slate-300">임신·출산 관련</p>
              <p className="text-xl font-bold text-sky-300 mt-0.5">
                {policies.filter(p => p.biz_lclsf_nm === '임신' || p.biz_lclsf_nm === '출산' || p.biz_lclsf_nm === '탄생응원').length}건
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3">
              <p className="text-xs text-slate-300">육아·보육 관련</p>
              <p className="text-xl font-bold text-emerald-300 mt-0.5">
                {policies.filter(p => p.biz_lclsf_nm === '육아' || p.biz_lclsf_nm === '건강힐링').length}건
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3">
              <p className="text-xs text-slate-300">일·생활 균형 및 기타</p>
              <p className="text-xl font-bold text-amber-300 mt-0.5">
                {policies.filter(p => p.biz_lclsf_nm === '일생활균형' || p.biz_lclsf_nm === '편한외출').length}건
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 검색어 입력 */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="정책명, 지원 대상, 정책 내용 검색..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-end md:self-center">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>검색 결과: <strong>{filteredPolicies.length}</strong>건</span>
          </div>
        </div>

        {/* 카테고리 칩 목록 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            분류:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
              {cat !== '전체' && (
                <span className="ml-1 text-[10px] opacity-80">
                  ({policies.filter(p => p.biz_lclsf_nm === cat).length})
                </span>
              )}
            </button>
          ))}
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
                  {policy.biz_lclsf_nm || '전체'}
                </span>
                {policy.biz_mclsf_nm && (
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {policy.biz_mclsf_nm}
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
                    {selectedPolicy.biz_lclsf_nm}
                  </span>
                  {selectedPolicy.biz_mclsf_nm && (
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
