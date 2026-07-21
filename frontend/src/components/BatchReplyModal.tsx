import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Building2, ExternalLink, FileText, Send, Sparkles } from 'lucide-react';
import { PolicyProposal } from '../types';

interface Props {
  isOpen: boolean;
  clusterId: string;
  clusterName: string;
  items: PolicyProposal[];
  onClose: () => void;
  onCompleteBatchReply?: (clusterId: string) => void;
}

export const BatchReplyModal: React.FC<Props> = ({
  isOpen,
  clusterId,
  clusterName,
  items,
  onClose,
  onCompleteBatchReply
}) => {
  if (!isOpen) return null;

  const representative = items[0];
  const matchedPolicies = representative?.matched_policies || [];
  const primaryDept = representative?.department_rankings?.find(r => r.rank === 1) || {
    dept_name: representative?.department[0] || '돌봄사업팀',
    full_dept: '서울특별시 여성가족실',
    phone: '02-2133-6560'
  };

  const defaultTemplate = `[서울특별시 ${primaryDept.dept_name} 공식 행정 답변 공문]

안녕하십니까, 서울시정에 깊은 관심을 가져주신 시민 여러분께 감사드립니다.

본 제안 묶음(${items.length}건)에 제출해주신 시민분들의 귀중한 의견을 면밀히 검토하였습니다.

1. 서울시 현황 및 추진 방향:
서울특별시는 시민 여러분께서 요구해주신 '${representative?.title || '관련 안건'}'과 관련하여 몽땅정보 만능키 공식 사업과 연계한 정책 강화를 적극 추진 중입니다.

2. 연계 정책 및 지원 서비스:
${matchedPolicies.length > 0 
  ? matchedPolicies.map(m => `- ${m.policy_name}: ${m.summary} (신청: ${m.apply_url})`).join('\n')
  : '- 서울시 임신 사전건강관리 및 아기 건강 첫걸음 지원사업 연계 지원중'}

3. 향후 조치 계획:
관련 자치구 및 소관 부서와의 협의를 거쳐 2026년 하반기 예산 및 사업 지침 개정에 적극 반영할 수 있도록 조치하겠습니다.

문의: ${primaryDept.full_dept} ${primaryDept.dept_name} (☎ ${primaryDept.phone})`;

  const [replyText, setReplyText] = useState(defaultTemplate);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onCompleteBatchReply?.(clusterId);
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

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
          <div className="p-5 bg-gradient-to-r from-[#0A2351] to-blue-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏛️</span>
              <div>
                <h3 className="font-bold text-base">유사 제안 원스톱 일괄 행정 답변 등록</h3>
                <p className="text-xs text-blue-100 font-medium">
                  {clusterName} | 총 <span className="font-bold text-yellow-300">{items.length}건</span> 개별 제안 일괄 수용 처리
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

          {/* Sub Info */}
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">주관 부서:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                {primaryDept.full_dept} {primaryDept.dept_name} (☎ {primaryDept.phone})
              </span>
            </div>
            {matchedPolicies.length > 0 && (
              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                <span>🎁 몽땅정보 연관혜택 자동 연동 완료 ({matchedPolicies.length}개 사업)</span>
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {isSuccess ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-black text-slate-900">원스톱 일괄 답변 등록 성공!</h4>
                <p className="text-xs text-slate-500">
                  해당 유사 제안 묶음 {items.length}건 전체에 공식 행정 답변 공문이 성공적으로 발송 및 처리되었습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 묶음 속 제안 리스트 미리보기 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    📋 일괄 답변 대상 제안 목록 ({items.length}건):
                  </label>
                  <div className="bg-slate-100/80 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 text-xs">
                    {items.map((it, idx) => (
                      <div key={it.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200/80">
                        <span className="font-bold text-slate-800 truncate max-w-[480px]">
                          {idx + 1}. [{it.district}] {it.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">공감 {it.vote_score}표</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 자동 생성 공문 편집 박스 */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      공식 행정 답변 공문 (몽땅정보 혜택 자동 연동)
                    </label>
                    <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI 자동 생성
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-slate-800"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!isSuccess && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {items.length}건 일괄 답변 및 등록 완료
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
