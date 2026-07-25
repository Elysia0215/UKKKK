import type { DepartmentRanking, PolicyProposal } from '../types';

/**
 * 상단 R&R 필터의 8개 담당군은 서울시 조직명이 아니라 정책 8대 대분류다.
 * 과거에는 각 분류를 임의의 대표 부서명(예: 주거정비과)으로 표시했지만,
 * 원본 업무분장과 혼동되므로 검증 가능한 대분류명을 그대로 사용한다.
 */
export const DEPARTMENT_GROUP_BY_CATEGORY: Record<string, string> = {
  '임신·난임·생식건강': '임신·난임·생식건강',
  '출산·산후 초기지원': '출산·산후 초기지원',
  '보육·돌봄 인프라': '보육·돌봄 인프라',
  '다자녀·양육비·생활지원': '다자녀·양육비·생활지원',
  '주거·교통·도시생활환경': '주거·교통·도시생활환경',
  '일·가정 양립·부모 노동': '일·가정 양립·부모 노동',
  '취약·다양가족 사각지대': '취약·다양가족 사각지대',
  '정보·상담·교육·거버넌스': '정보·상담·교육·거버넌스',
};

export const DEPARTMENT_GROUPS = Array.from(
  new Set(Object.values(DEPARTMENT_GROUP_BY_CATEGORY)),
);

export const getDepartmentGroup = (
  proposal: PolicyProposal,
): string => DEPARTMENT_GROUP_BY_CATEGORY[proposal.category] || '미지정';

const fallbackRanking = (proposal: PolicyProposal): DepartmentRanking[] => {
  const deptName = proposal.department?.[0];
  if (!deptName) return [];

  return [{
    rank: 1,
    role_type: '주관부서',
    dept_name: deptName,
    full_dept: deptName,
    phone: '',
    duty_summary: '',
  }];
};

export const getSortedDepartmentRankings = (
  proposal: PolicyProposal,
): DepartmentRanking[] => {
  const rankings = proposal.department_rankings?.length
    ? proposal.department_rankings
    : fallbackRanking(proposal);

  return [...rankings].sort((a, b) => a.rank - b.rank);
};

export const getPrimaryDepartment = (
  proposal: PolicyProposal,
): DepartmentRanking | undefined => {
  const rankings = getSortedDepartmentRankings(proposal);
  return rankings.find((ranking) => ranking.rank === 1) ?? rankings[0];
};

export const getCollaboratingDepartments = (
  proposal: PolicyProposal,
): DepartmentRanking[] => (
  getSortedDepartmentRankings(proposal).filter((ranking) => ranking.rank > 1)
);

export const getProposalDepartmentNames = (
  proposal: PolicyProposal,
): string[] => (
  Array.from(new Set(
    getSortedDepartmentRankings(proposal)
      .map((ranking) => ranking.dept_name)
      .filter(Boolean),
  ))
);

export const proposalMatchesDepartment = (
  proposal: PolicyProposal,
  department: string,
): boolean => (
  department === '전체'
  || getProposalDepartmentNames(proposal).includes(department)
);

export const proposalMatchesPrimaryDepartment = (
  proposal: PolicyProposal,
  department: string,
): boolean => (
  department === '전체'
  || getPrimaryDepartment(proposal)?.dept_name === department
);

export const proposalMatchesDepartmentGroup = (
  proposal: PolicyProposal,
  departmentGroup: string,
): boolean => (
  departmentGroup === '전체'
  || getDepartmentGroup(proposal) === departmentGroup
);

export const proposalMatchesAnyDepartment = (
  proposal: PolicyProposal,
  departments: string[],
): boolean => (
  departments.includes('전체')
  || departments.some((department) => proposalMatchesDepartment(proposal, department))
);

export const proposalMatchesAnyPrimaryDepartment = (
  proposal: PolicyProposal,
  departments: string[],
): boolean => (
  departments.includes('전체')
  || departments.some((department) => (
    proposalMatchesPrimaryDepartment(proposal, department)
  ))
);

export const getDepartmentOptions = (
  proposals: PolicyProposal[],
): string[] => (
  Array.from(new Set(
    proposals.flatMap(getProposalDepartmentNames),
  )).sort((a, b) => a.localeCompare(b, 'ko'))
);
