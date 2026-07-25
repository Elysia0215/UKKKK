import type { PolicyProposal } from '../types';

const PLACEHOLDER_PHRASES = [
  '접수된 시민 정책 제안입니다',
  '국민신문고를 통해 접수된',
];

export const isPlaceholderProposalContent = (
  proposal: Pick<PolicyProposal, 'title' | 'content'>,
): boolean => {
  const title = (proposal.title || '').trim();
  const content = (proposal.content || '').trim();

  return !content
    || content === title
    || content.length < 30
    || PLACEHOLDER_PHRASES.some((phrase) => content.includes(phrase));
};

export const getProposalDisplayContent = (
  proposal: Pick<PolicyProposal, 'title' | 'content'>,
): string => (
  isPlaceholderProposalContent(proposal)
    ? '상세 원문이 현재 화면 데이터에 연결되지 않았습니다. 아래 원문 링크에서 전체 내용을 확인할 수 있습니다.'
    : proposal.content
);
