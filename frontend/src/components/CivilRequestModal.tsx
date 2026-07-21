import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { CivilRequest } from '../types';
import { mockCivilRequests } from '../data/mockData';

interface Props {
  isOpen: boolean;
  category: string;
  onClose: () => void;
}

export const CivilRequestModal: React.FC<Props> = ({ isOpen, category, onClose }) => {
  if (!isOpen) return null;

  // 카테고리 관련 민원 필터링
  const relatedRequests = mockCivilRequests.filter(
    req => req.category === category || category === '전체'
  );

  const displayList = relatedRequests.length > 0 ? relatedRequests : mockCivilRequests;

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
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏛️</span>
              <div>
                <h3 className="font-bold text-base">국민권익위원회 연동 민원 리스트</h3>
                <p className="text-xs text-emerald-100 font-medium">
                  분야: <span className="font-bold underline">{category}</span> | 국민신문고 민원 빅데이터 분석 연동
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Header Notice */}
          <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>서울시 상상대로 제안 외에도 전국 단위 권익위 민원과 종합 분석된 결과입니다.</span>
          </div>

          {/* Content Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {displayList.map((req, idx) => (
              <div
                key={req.id || idx}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {req.category} 민원
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {req.reg_date}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  {req.title}
                </h4>

                <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line">
                  {req.content}
                </p>

                <div className="flex justify-between items-center pt-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-[11px] text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    관련 부서: <strong className="text-slate-700">{req.dept}</strong>
                  </span>

                  <a
                    href={req.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-bold text-xs bg-emerald-100/60 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors"
                  >
                    권익위 원문보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
