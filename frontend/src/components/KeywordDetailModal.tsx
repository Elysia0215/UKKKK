import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, ThumbsUp, MessageSquare, Building2, Calendar, FileText } from 'lucide-react';
import { PolicyProposal } from '../types';

interface Props {
  isOpen: boolean;
  keyword: string | null;
  proposals: PolicyProposal[];
  onClose: () => void;
}

export const KeywordDetailModal: React.FC<Props> = ({ isOpen, keyword, proposals, onClose }) => {
  if (!isOpen || !keyword) return null;

  // 선택된 키워드 및 정규화 카테고리 텍스트 확장 매칭
  const searchTerms: string[] = [];
  if (keyword === '보육/돌봄') searchTerms.push('보육', '돌봄', '어린이집', '키즈카페', '유치원');
  else if (keyword === '다자녀기준') searchTerms.push('다자녀', '2자녀', '3자녀', '다자녀카드');
  else if (keyword === '공공시설') searchTerms.push('공공', '국공립', '시설');
  else if (keyword === '산후조리원') searchTerms.push('산후조리', '산후조리원', '조리원');
  else if (keyword === '임산부지원') searchTerms.push('임산부', '산모', '미혼모', '임신');
  else if (keyword === '소아응급의료') searchTerms.push('응급실', '소아과', '진료', '응급');
  else if (keyword === '돌봄인력') searchTerms.push('도우미', '베이비시터', '돌봄');
  else if (keyword === '직접적바우처') searchTerms.push('바우처', '지원금', '보조금', '교통비');
  else if (keyword === '유모차대여') searchTerms.push('유모차');
  else searchTerms.push(keyword);

  const relatedProposals = proposals.filter(p => 
    searchTerms.some(term => p.title.includes(term) || p.content.includes(term))
  ).sort((a, b) => b.vote_score - a.vote_score);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#0A2351] to-blue-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📊</span>
              <div>
                <h3 className="font-bold text-base">키워드 연관 제안 견본 분석</h3>
                <p className="text-xs text-blue-100 font-medium">
                  핵심 키워드: <span className="font-bold text-yellow-300 underline">#{keyword}</span> | 총 <span className="font-bold">{relatedProposals.length}건</span> 연관 제안 감지
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Notice */}
          <div className="bg-blue-50 px-5 py-2.5 border-b border-blue-100 text-xs text-blue-900 flex items-center justify-between font-medium">
            <span>시민들이 작성한 상상대로 서울 제안 원문 중 #{keyword} 관련 실시간 텍스트 데이터입니다.</span>
            <span className="text-blue-700 font-bold">공감도 높은 순 정렬</span>
          </div>

          {/* Body List */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {relatedProposals.length > 0 ? (
              relatedProposals.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-[#0A2351] text-white px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">{item.id}</span>
                      <span className="text-xs text-slate-500 font-bold">{item.district}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.reg_date}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed line-clamp-3">
                    {item.content}
                  </p>

                  <div className="flex justify-between items-center pt-1 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      담당팀: {item.department.join(', ')}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-blue-600 font-bold">
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {item.vote_score}표
                      </span>
                      <a
                        href={item.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${item.id.replace('PROP-', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline font-bold text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> 원문보기
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                해당 키워드가 직접 포함된 텍스트 제안이 존재하지 않습니다.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
