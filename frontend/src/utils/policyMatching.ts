type MatchablePolicy = {
  biz_nm?: string;
  biz_cn?: string;
  biz_se_nm?: string;
  biz_type_nm?: string;
  applc_trgt_cn?: string;
  srvc_cn?: string;
  [key: string]: unknown;
};

const POLICY_STOP_WORDS = new Set([
  '서울', '서울시', '서울형', '사업', '정책', '지원', '시행', '관련',
  '이상', '이하', '대상', '시민', '서비스', '제공', '신청',
]);

const BIRTH_POLICY_TERMS = [
  '임신', '임산부', '출산', '산모', '신생아', '난임', '육아', '양육',
  '보육', '어린이집', '다자녀', '아이돌봄', '산후', '가임',
];

const OUT_OF_SCOPE_TERMS = [
  '버스', '지하철', '승차', '하차', '교통카드', '시니어패스',
  '노인', '어르신', '고령자', '노약자',
];

const NON_BIRTH_PUBLIC_HEALTH_TERMS = [
  '흡연', '담배', '담배꽁초', '간접흡연', '금연', '폐암',
];

const BIRTH_POLICY_ACTION_TERMS = [
  '임신 지원', '임산부 지원', '출산 지원', '산모 지원', '신생아 지원',
  '육아 지원', '양육 지원', '보육 지원', '아이돌봄', '어린이집',
  '난임 지원', '다자녀 지원', '산후조리', '가임력',
];

const WORK_LIFE_TERMS = [
  '육아휴직', '근로시간', '근로단축', '단축근무', '출산휴가', '돌봄휴가',
  '복직', '퇴사', '맞벌이', '직장', '프리랜서', '자영업',
];

const WORK_POLICY_TERMS = [
  '육아휴직', '근로시간', '출산휴가', '일생활', '일·생활', '일?생활',
  '생활 균형', '프리랜서', '자영업', '아이돌봄',
];

const HOUSING_POLICY_TERMS = [
  '신혼부부', '신혼', '무주택', '주거', '주택', '임차', '보증금',
  '대출', '희망타운', '살림비용', '결혼',
];

const PREGNANT_TRANSPORT_TERMS = [
  '임산부 배려석', '임산부배려석', '임산부석', '배려석', '뱃지', '배지',
  '지하철', '버스', '대중교통', '교통약자', '좌석', '양보',
];

const PREGNANT_TRANSPORT_POLICY_TERMS = [
  '임산부 배려공간', '배려공간', '교통 약자', '양보', '엘리베이터',
  '임산부 교통', 'KTX', 'SRT',
];

const CHILD_FRIENDLY_PLACE_TERMS = [
  '키즈오케이존', '키즈 오케이존', '아이 동반', '아이와 양육자',
  '음식점', '카페', '외식', '환영받고', '아이의자', '아이식기',
];

const DISABILITY_TERMS = [
  '장애인', '장애아', '장애', '발달장애', '특수교육', '특수학교', '휠체어',
];

const DISABILITY_POLICY_TERMS = [
  '장애인가정', '장애인', '장애아', '장애', '홈헬퍼', '여성장애인',
];

const UTILITY_POLICY_TERMS = ['하수도', '상하수도', '수도요금', '전기요금', '도시가스'];
const UTILITY_PROPOSAL_TERMS = ['하수도', '상하수도', '수도요금', '전기요금', '도시가스', '공공요금'];
const VEHICLE_TAX_POLICY_TERMS = ['자동차 취득세', '차량 취득세', '취득세'];
const VEHICLE_TAX_PROPOSAL_TERMS = ['자동차 취득세', '차량 취득세', '취득세', '자동차 구입', '차량 구입', '자동차 구매', '차량 구매'];

const normalizeToken = (token: string): string => (
  token
    .toLowerCase()
    .replace(/^[^0-9a-z가-힣]+|[^0-9a-z가-힣]+$/g, '')
);

const tokenize = (text: string): Set<string> => {
  const tokens = text
    .split(/[\s,·()[\]{}<>"'“”‘’/|:+\-]+/)
    .map(normalizeToken)
    .filter((token) => (
      token.length >= 2
      && !POLICY_STOP_WORDS.has(token)
    ));

  return new Set(tokens);
};

const hasAny = (text: string, terms: string[]): boolean => (
  terms.some((term) => text.includes(term))
);

const getPolicySearchText = (policy: MatchablePolicy): string => {
  const values = [
    policy.biz_nm,
    policy.biz_cn,
    policy.biz_se_nm,
    policy.biz_type_nm,
    policy.applc_trgt_cn,
    policy.srvc_cn,
    policy['사업명'],
    policy['사업내용'],
    policy['지원대상'],
    policy['이용대상'],
  ];

  return values
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
};

export const isOutsideBirthPolicyScope = (
  title: string,
  content: string,
): boolean => {
  const text = `${title} ${content}`.toLowerCase();
  const hasBirthTerm = BIRTH_POLICY_TERMS.some((term) => text.includes(term));
  const hasOutOfScopeTerm = OUT_OF_SCOPE_TERMS.some((term) => text.includes(term));
  const hasPublicHealthTerm = NON_BIRTH_PUBLIC_HEALTH_TERMS.some(
    (term) => text.includes(term),
  );
  const hasBirthPolicyAction = BIRTH_POLICY_ACTION_TERMS.some(
    (term) => text.includes(term),
  );

  // 임산부·어린이가 단순 피해대상으로 언급됐을 뿐 제안의 핵심이
  // 흡연 규제 같은 일반 공중보건이면 출산·양육 정책으로 보지 않는다.
  if (hasPublicHealthTerm && !hasBirthPolicyAction) return true;

  return hasOutOfScopeTerm && !hasBirthTerm;
};

export const findBestMatchingPolicy = <T extends MatchablePolicy>(
  title: string,
  content: string,
  policies: T[],
): T | undefined => {
  if (isOutsideBirthPolicyScope(title, content)) return undefined;

  const titleTokens = tokenize(title);
  const proposalText = `${title} ${content}`;
  const proposalTokens = tokenize(proposalText);
  const isWorkLifeProposal = hasAny(proposalText, WORK_LIFE_TERMS);
  const hasDisabilityContext = hasAny(proposalText, DISABILITY_TERMS);
  const isPregnantTransportProposal = (
    proposalText.includes('임산부')
    && hasAny(proposalText, PREGNANT_TRANSPORT_TERMS)
  );

  let best: { policy: T; score: number; sharedCount: number } | undefined;

  policies.forEach((policy) => {
    if (!policy.biz_nm) return;
    const policyText = getPolicySearchText(policy);
    if (!hasDisabilityContext && hasAny(policyText, DISABILITY_POLICY_TERMS)) {
      return;
    }
    if (hasAny(policyText, UTILITY_POLICY_TERMS) && !hasAny(proposalText, UTILITY_PROPOSAL_TERMS)) {
      return;
    }
    if (hasAny(policyText, VEHICLE_TAX_POLICY_TERMS) && !hasAny(proposalText, VEHICLE_TAX_PROPOSAL_TERMS)) {
      return;
    }
    if (
      isPregnantTransportProposal
      && hasAny(policyText, CHILD_FRIENDLY_PLACE_TERMS)
    ) {
      return;
    }
    if (
      isPregnantTransportProposal
      && !hasAny(policyText, PREGNANT_TRANSPORT_POLICY_TERMS)
    ) {
      return;
    }
    if (
      isWorkLifeProposal
      && hasAny(policyText, HOUSING_POLICY_TERMS)
      && !hasAny(policyText, WORK_POLICY_TERMS)
    ) {
      return;
    }

    const policyTokens = tokenize(policyText || policy.biz_nm);
    const shared = [...policyTokens].filter((token) => proposalTokens.has(token));
    const titleMatches = shared.filter((token) => titleTokens.has(token)).length;
    const workPolicyBonus = (
      isWorkLifeProposal && hasAny(policyText, WORK_POLICY_TERMS)
    ) ? 2 : 0;
    const pregnantTransportBonus = (
      isPregnantTransportProposal && hasAny(policyText, PREGNANT_TRANSPORT_POLICY_TERMS)
    ) ? 3 : 0;
    const score = shared.length + (titleMatches * 2) + workPolicyBonus + pregnantTransportBonus;

    if (
      shared.length > 0
      && (!best || score > best.score || (
        score === best.score && shared.length > best.sharedCount
      ))
    ) {
      best = { policy, score, sharedCount: shared.length };
    }
  });

  if (!best) return undefined;

  // 대상어 하나(예: 영유아)만 같고 정책 행위가 다른 오매칭을 막기 위해
  // 서로 다른 핵심어가 두 개 이상 일치할 때만 관련 정책으로 인정한다.
  return best.sharedCount >= 2
    ? best.policy
    : undefined;
};
