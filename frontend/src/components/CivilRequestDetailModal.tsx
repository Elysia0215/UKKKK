import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Building2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { PolicyProposal } from '../types';
import { formatProposalContent } from '../utils/formatText';

export interface CivilRequestItem {
  id: string;
  peti_no: string;
  title: string;
  content: string;
  reg_date: string;
  status: string;
  category: string;
  dept: string;
  is_seoul: boolean;
  url: string;
}

interface Props {
  isOpen: boolean;
  proposal: PolicyProposal | null;
  relatedCivilRequests: CivilRequestItem[];
  onClose: () => void;
}

export const CivilRequestDetailModal: React.FC<Props> = ({
  isOpen,
  proposal,
  relatedCivilRequests,
  onClose
}) => {
  if (!isOpen || !proposal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-900 via-blue-900 to-[#0A2351] text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/30">
                <FileText className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  국민신문고 연관 민원 원문 분석 및 열람
                </h3>
                <p className="text-xs text-indigo-200 font-medium">
                  안건: <span className="font-bold text-yellow-300">[{proposal.id}] {proposal.title}</span>
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

          {/* Sub Banner */}
          <div className="bg-indigo-50/80 px-5 py-3 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-950 font-medium">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                국민신문고 연동
              </span>
              <span>
                해당 시민 제안 주제와 관련된 국민신문고 실제 접수 민원 총 <strong className="text-indigo-700 underline">{relatedCivilRequests.length}건</strong>이 매칭되었습니다.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">데이터 출처: 공공데이터포털 국민신문고 API</span>
          </div>

          {/* Body List */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {relatedCivilRequests.length > 0 ? (
              relatedCivilRequests.map((req, idx) => (
                <div
                  key={req.id || idx}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-indigo-300 transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${req.is_seoul ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'}`}>
                        {req.is_seoul ? '서울시 배정' : '전국 기관'}
                      </span>
                      <span className="text-xs text-indigo-900 font-mono font-bold">{req.id}</span>
                      <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {req.dept}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {req.reg_date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${req.status === '답변완료' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{req.title}</h4>

                  {/* 원문 내용 (formatProposalContent + whitespace-pre-line) */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 leading-relaxed text-xs text-slate-700 whitespace-pre-line font-sans shadow-2xs max-h-[220px] overflow-y-auto">
                    {formatProposalContent(req.content)}
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-[11px] text-slate-400">카테고리: {req.category}</span>
                    <a
                      href={req.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>국민신문고 공식 웹사이트 포털 열람</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p>해당 제안과 1:1 직접 매칭된 국민신문고 추가 민원이 존재하지 않습니다.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
