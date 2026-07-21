import React, { useState, useMemo } from 'react';
import { DistrictData, SEOUL_POLICIES_SAMPLE } from '../data/seoulData';
import { Search, SlidersHorizontal, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PolicyExplorerProps {
  selectedDistrict: DistrictData;
}

export const PolicyExplorer: React.FC<PolicyExplorerProps> = ({ selectedDistrict }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const categories = useMemo(() => {
    const list = new Set(SEOUL_POLICIES_SAMPLE.map((p) => p.category));
    return ['전체', ...Array.from(list)];
  }, []);

  const filteredPolicies = useMemo(() => {
    return SEOUL_POLICIES_SAMPLE.filter((policy) => {
      const categoryMatch = selectedCategory === '전체' || policy.category === selectedCategory;
      const searchMatch =
        policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.target.toLowerCase().includes(searchTerm.toLowerCase());
      const areaMatch =
        policy.area === '서울시 전체' ||
        policy.area === '전 자치구' ||
        policy.area.includes(selectedDistrict.name);

      return categoryMatch && searchMatch && areaMatch;
    });
  }, [selectedDistrict, selectedCategory, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 bg-indigo-50/10">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          {selectedDistrict.name} 맞춤형 출산·양육 지원사업 공공데이터
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          현재 선택된 자치구(<span className="font-semibold text-indigo-600">{selectedDistrict.name}</span>)의 보육 혜택 공공데이터 목록입니다.
        </p>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="지원사업명, 이용대상, 혜택내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto max-h-[450px] space-y-4 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filteredPolicies.length > 0 ? (
            filteredPolicies.map((policy) => (
              <motion.div
                key={policy.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all flex flex-col gap-2 relative overflow-hidden group"
              >
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  {policy.demandScore >= 90 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 animate-pulse">
                      ★ 인기·핵심 정책
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                    수요지수: {policy.demandScore}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    policy.category === '임신' ? 'bg-emerald-50 text-emerald-600' :
                    policy.category === '출산' ? 'bg-indigo-50 text-indigo-600' :
                    policy.category === '보육' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {policy.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{policy.department}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-800 pr-24 group-hover:text-indigo-600 transition-colors">
                  {policy.name}
                </h4>

                <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-50 leading-relaxed">
                  {policy.content}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">이용대상</span>
                    <p className="line-clamp-2">{policy.target}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">신청방법</span>
                    <p className="line-clamp-2">{policy.howToApply}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-50">
                  <span className="text-[10px] text-indigo-500 font-medium">제공처: 서울특별시 공공데이터 포털</span>
                  <a
                    href="https://umppa.seoul.go.kr"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"
                  >
                    공식 신청처 바로가기 <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200"
            >
              <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700">해당 조건의 공공 데이터가 없습니다.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-slate-900 text-slate-300 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-mono text-indigo-400 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {selectedDistrict.name} 분석 결과: 총 {filteredPolicies.length}개 혜택 지원 가능
        </span>
      </div>
    </div>
  );
};

export default PolicyExplorer;
