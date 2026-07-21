import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  Building2, 
  Calendar, 
  FileText, 
  AlertCircle, 
  ChevronRight,
  Layers
} from 'lucide-react';
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
  sub_category?: string;
  micro_category?: string;
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
  relatedCivilRequests = [],
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
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-900 via-blue-900 to-[#0A2351] text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/30">
                <FileText className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  📩 국민신문고 연관 민원 실시간 교차 분석
                </h3>
                <p className="text-xs text-indigo-200 font-medium">
                  연계 안건: <span className="font-bold text-yellow-300">[{proposal.id}] {proposal.title}</span>
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
                국민신문고 API 연동
              </span>
              <span>
                해당 시민 제안 주제와 관련된 현장 민원 총 <strong className="text-indigo-700 underline font-black">{relatedCivilRequests.length}건</strong>이 정밀 매칭되었습니다.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">출처: 국민권익위 OpenProposal API</span>
          </div>

          {/* Body List */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {relatedCivilRequests.length > 0 ? (
              relatedCivilRequests.map((req, idx) => (
                <div
                  key={req.id || idx}
                  className="bg-white rounded-2xl p-4.5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all space-y-3"
                >
                  {/* 상단 메타 헤더 */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${req.is_seoul ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'}`}>
                        {req.is_seoul ? '서울시 기관' : '전국/타 기관'}
                      </span>
                      <span className="font-mono text-xs text-indigo-900 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        {req.dept}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {req.reg_date}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                        req.status === '답변완료' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* 정책 분류 계층 체계 배지 */}
                  {(req.category || req.sub_category) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 w-fit">
                      <Layers className="w-3 h-3 text-indigo-500 mr-0.5" />
                      <span className="font-bold text-indigo-700">{req.category}</span>
                      {req.sub_category && (
                        <>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <span className="font-medium text-slate-700">{req.sub_category}</span>
                        </>
                      )}
                      {req.micro_category && (
                        <>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <span className="text-slate-500">{req.micro_category}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* 제안 제목 */}
                  <h4 className="font-bold text-sm text-slate-900 leading-snug flex items-start gap-1.5">
                    <span className="text-indigo-600 shrink-0">📌</span>
                    <span>{req.title}</span>
                  </h4>

                  {/* 본문 텍스트 (가독성 최우선 리더 박스) */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 leading-relaxed text-xs text-slate-800 whitespace-pre-line font-sans max-h-[220px] overflow-y-auto shadow-2xs">
                    {formatProposalContent(req.content)}
                  </div>

                  {/* 하단 푸터 액션 */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400">
                      출처: 국민권익위원회 국민신문고
                    </span>
                    <a
                      href={req.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                      title="국민신문고 공식 포털에서 원문 전체 및 처리 내역을 열람합니다."
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>국민신문고 포털에서 원문 전체 열람 ↗</span>
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2 bg-white border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p>해당 제안과 1:1 매칭된 국민신문고 민원 안건이 존재하지 않습니다.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              * 각 민원 카드의 [원문 전체 열람 ↗] 링크를 눌러 국민신문고 포털 공식 답변 내역을 확인하실 수 있습니다.
            </span>
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
