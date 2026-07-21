import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Building2, 
  ExternalLink, 
  FileText, 
  Send, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Calendar,
  ThumbsUp
} from 'lucide-react';
import { PolicyProposal } from '../types';
import { formatProposalContent } from '../utils/formatText';

interface Props {
  isOpen: boolean;
  clusterId: string;
  clusterName: string;
  items: PolicyProposal[];
  onClose: () => void;
  onCompleteBatchReply?: (clusterId: string, selectedIds?: string[]) => void;
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

  // 선택된 제안 ID 목록 (기본값: 전체 선택)
  const [selectedIds, setSelectedIds] = useState<string[]>(items.map(i => i.id));
  // 펼쳐진 제안 ID 목록 (본문 확인용)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const representative = items[0];
  const matchedPolicies = representative?.matched_policies || [];
  const primaryDept = representative?.department_rankings?.find(r => r.rank === 1) || {
    dept_name: representative?.department[0] || '저출생사업1팀',
    full_dept: '서울특별시 여성가족실',
    phone: '02-2133-5021'
  };

  const selectedItems = useMemo(() => {
    return items.filter(i => selectedIds.includes(i.id));
  }, [items, selectedIds]);

  const defaultTemplate = useMemo(() => {
    return `[서울특별시 ${primaryDept.dept_name} 공식 행정 답변 공문]

안녕하십니까, 서울시정에 깊은 관심을 가져주신 시민 여러분께 감사드립니다.

본 제안 묶음(${selectedItems.length}건)에 제출해주신 시민분들의 귀중한 의견을 면밀히 검토하였습니다.

1. 서울시 현황 및 추진 방향:
서울특별시는 시민 여러분께서 요구해주신 '${representative?.title || '관련 안건'}'과 관련하여 몽땅정보 만능키 공식 사업과 연계한 정책 강화를 적극 추진 중입니다.

2. 연계 정책 및 지원 서비스:
${matchedPolicies.length > 0 
  ? matchedPolicies.map(m => {
      const url = (!m.apply_url || m.apply_url.trim() === '.' || !m.apply_url.startsWith('http')) ? 'https://umppa.seoul.go.kr/' : m.apply_url.trim();
      return `- ${m.policy_name}: ${m.summary} (신청: ${url})`;
    }).join('\n')
  : '- 서울시 임신 사전건강관리 및 아기 건강 첫걸음 지원사업 연계 지원중'}

3. 향후 조치 계획:
관련 자치구 및 소관 부서와의 협의를 거쳐 2026년 하반기 예산 및 사업 지침 개정에 적극 반영할 수 있도록 조치하겠습니다.

문의: ${primaryDept.full_dept} ${primaryDept.dept_name} (☎ ${primaryDept.phone})`;
  }, [selectedItems.length, representative, matchedPolicies, primaryDept]);

  const [replyText, setReplyText] = useState(defaultTemplate);
  const [isSuccess, setIsSuccess] = useState(false);

  // 개별 체크박스 토글
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 전체 선택 / 해제
  const toggleAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  // 본문 펼침 토글
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      alert('일괄 답변을 등록할 제안을 최소 1건 이상 선택해 주세요.');
      return;
    }
    setIsSuccess(true);
    setTimeout(() => {
      onCompleteBatchReply?.(clusterId, selectedIds);
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
                  {clusterName} | 총 <span className="font-bold text-yellow-300">{items.length}건</span> 중 <span className="font-bold text-emerald-300">{selectedIds.length}건 확정선택</span>
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
                  선택하신 유사 제안 {selectedIds.length}건에 공식 행정 답변 공문이 성공적으로 발송 및 처리되었습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 묶음 속 제안 리스트 검증 & 개별 선택 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      📋 일괄 답변 대상 제안 검증 및 선택 ({selectedIds.length}/{items.length}건 선택):
                    </label>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-[#0A2351] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {selectedIds.length === items.length ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{selectedIds.length === items.length ? '전체 해제' : '전체 선택'}</span>
                    </button>
                  </div>

                  <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>🤖 <strong>AI 안건 검증 단계</strong>: AI가 군집화한 안건입니다. 각 제안의 <strong>[본문 보기]</strong>로 내용을 확인하신 후 답변할 안건을 선택(체크)해 주세요.</span>
                  </div>

                  <div className="bg-slate-100/80 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 border border-slate-200 text-xs">
                    {items.map((it, idx) => {
                      const isSelected = selectedIds.includes(it.id);
                      const isExpanded = !!expandedIds[it.id];
                      return (
                        <div 
                          key={it.id} 
                          className={`rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-white border-blue-300 shadow-2xs' 
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(it.id)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-[10px] bg-[#0A2351] text-white px-1.5 py-0.2 rounded font-bold">{it.district}</span>
                                  <span className="text-[10px] text-slate-500 font-mono font-bold">{it.id}</span>
                                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{it.reg_date}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5 text-blue-500" />공감 {it.vote_score}표</span>
                                </div>
                                <h5 className={`text-xs font-bold text-slate-900 truncate ${!isSelected ? 'line-through text-slate-400' : ''}`}>
                                  {idx + 1}. {it.title}
                                </h5>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleExpand(it.id)}
                              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <span>{isExpanded ? '닫기' : '본문 보기'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* 본문 펼침 영역 (whitespace-pre-line + formatProposalContent 적용 + 원문 URL 검증 링크) */}
                          {isExpanded && (
                            <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50/80 rounded-b-xl space-y-2 text-xs">
                              <div className="font-bold text-slate-700 text-[11px] flex items-center justify-between">
                                <span>📜 시민 제안 원문 본문</span>
                                <span className="text-slate-400 font-mono text-[10px]">담당부서: {it.department.join(', ')}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line max-h-[180px] overflow-y-auto font-sans shadow-2xs">
                                {formatProposalContent(it.content)}
                              </div>
                              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60 text-xs">
                                <span className="text-[11px] text-slate-500 font-mono">제안번호: {it.id}</span>
                                <a
                                  href={it.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${it.id.replace('PROP-', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-100 transition-colors cursor-pointer"
                                  title="실제 상상대로 서울 포털의 원문 게시글을 즉시 열람하여 검증합니다."
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>상상대로 서울 원문 URL 직접 확인 ↗</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 자동 생성 공문 편집 박스 */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      공식 행정 답변 공문 (선택된 {selectedIds.length}건 적용)
                    </label>
                    <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI 자동 생성
                    </span>
                  </div>
                  <textarea
                    rows={8}
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedIds.length === 0}
              >
                <Send className="w-3.5 h-3.5" />
                {selectedIds.length}건 확정 일괄 답변 등록 완료
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
