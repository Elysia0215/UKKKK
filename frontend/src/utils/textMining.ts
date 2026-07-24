/**
 * 한국어 텍스트 마이닝 공통 유틸리티
 * - 조사/어미 제거 (형태소 정규화)
 * - 유사어/복합어 통합
 * - 불용어 사전
 * - 지명 키워드 → 자치구 매핑
 * - 동음이의어 관리
 *
 * API 크롤링, 실시간 데이터 수집, 프론트엔드 분석 등
 * 프로젝트 전반에서 일관된 텍스트 처리를 위해 사용
 */

// ─── 한국어 조사/어미 제거 ─────────────────────────────────
/** 한국어 조사·접미사를 제거하여 어근을 추출합니다 */
export function normalizeKoreanWord(word: string): string {
  const suffixes = [
    '에서는', '에서도', '으로는', '으로도', '에서의', '이라는', '이라고', '이라면',
    '에서', '으로', '부터', '까지', '에는', '에도', '에게', '처럼', '만큼', '이라',
    '에선', '으론', '이고', '이나', '이든', '이면', '이랑',
    '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '와', '과',
    '로', '며', '고', '나', '든', '랑', '요'
  ];
  let result = word;
  for (const s of suffixes) {
    if (result.endsWith(s) && result.length - s.length >= 2) {
      result = result.slice(0, -s.length);
      break;
    }
  }
  return result;
}

// ─── 유사어/복합어 통합 맵 (출산·양육 도메인) ──────────────
export const SYNONYM_MERGES: Record<string, string> = {
  '임산부석': '임산부배려석',
  '배려석': '임산부배려석',
  '임산부배려': '임산부배려석',
  '아이들': '아이',
  '아이가': '아이',
  '출산율': '출산',
  '출생률': '출산',
  '출생율': '출산',
  '다둥이': '다자녀',
};

// ─── 불용어 사전 ────────────────────────────────────────────
export const STOP_WORDS = new Set([
  '서울시', '서울', '지원', '관한', '위한', '대해', '관하여', '합니다',
  '해주세요', '부탁드립니다', '제안합니다', '생각합니다', '경우', '관련',
  '있는', '있습니다', '제안', '대한', '하는', '있도록', '위해',
  '많이', '좋겠습니다', '현재', '많은', '너무', '같습니다', '하고',
  '안녕하세요', '갈습니다', '없습니다', '때문에', '통해', '아래',
  '또한', '있게', '혜택', '주세요', '저는', '것입니다', '그리고', '아이들이',
  '다른', '서울시에서', '같은', '그래서', '것이', '것을', '해서', '하며',
  '필요', '시민', '정책', '이용', '하여', '있다', '없다', '한다',
  '수있', '않는', '하면', '해야', '될수', '있을', '했으면', '바랍니다',
  '항상', '이런', '이번', '그런', '저런', '정말', '진짜', '매우',
  '하지', '되는', '되어', '되고', '되면', '됐으면', '같이',
]);

/**
 * 원문 텍스트에서 키워드를 추출합니다.
 * 조사 제거 → 유사어 통합 → 불용어 제거 → 빈도 카운트
 */
export function extractNormalizedKeywords(text: string): Record<string, number> {
  const cleaned = text.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/);
  const keywordMap: Record<string, number> = {};

  words.forEach(w => {
    if (w.length < 2) return;
    let normalized = normalizeKoreanWord(w);
    if (SYNONYM_MERGES[normalized]) {
      normalized = SYNONYM_MERGES[normalized];
    }
    if (normalized.length >= 2 && !STOP_WORDS.has(normalized) && !STOP_WORDS.has(w)) {
      keywordMap[normalized] = (keywordMap[normalized] || 0) + 1;
    }
  });

  return keywordMap;
}

// ─── 자치구 지명 키워드 매핑 ────────────────────────────────
export const DISTRICT_KEYWORDS: Record<string, string[]> = {
  '종로구': ['종로', '혜화', '광화문', '경복궁', '인사동', '북촌', '서촌', '창덕궁', '창경궁', '대학로'],
  '중구': ['명동', '남대문', '을지로', '충무로', '동대문디자인', 'DDP', '서울역'],
  '용산구': ['이태원', '한남', '용산역', '한강대로', '남영', '효창공원', '삼각지'],
  '성동구': ['성수', '왕십리', '행당', '마장', '서울숲', '뚝섬'],
  '광진구': ['건대', '구의', '자양', '광나루', '아차산', '능동'],
  '동대문구': ['회기', '청량리', '전농', '답십리', '이문', '장안동'],
  '중랑구': ['중랑', '면목', '상봉', '망우', '신내'],
  '성북구': ['성북', '길음', '돈암', '정릉', '삼선교', '보문', '한성대'],
  '강북구': ['강북', '미아', '번동', '수유', '우이', '4.19'],
  '도봉구': ['도봉', '쌍문', '방학', '창동역', '도봉산'],
  '노원구': ['노원', '상계', '중계', '하계', '월계', '공릉', '태릉'],
  '은평구': ['은평', '불광', '응암', '역촌', '연신내', '녹번', '구파발'],
  '서대문구': ['서대문', '신촌', '연희', '홍은', '이화여대', '연세대', '충정로'],
  '마포구': ['마포', '홍대', '합정', '상암', '망원', '연남', '공덕'],
  '양천구': ['양천', '목동', '신정', '신월'],
  '강서구': ['강서', '화곡', '등촌', '마곡', '발산', '김포공항'],
  '구로구': ['구로', '신도림', '개봉', '오류', '고척', '디지털단지'],
  '금천구': ['금천', '가산', '독산', '시흥대로'],
  '영등포구': ['영등포', '여의도', '당산', '양평', '문래', '신길'],
  '동작구': ['동작', '노량진', '사당', '이수', '흑석', '상도'],
  '관악구': ['관악', '신림', '봉천', '서울대', '낙성대'],
  '서초구': ['서초', '반포', '잠원', '양재', '내곡', '교대'],
  '강남구': ['강남', '역삼', '삼성', '대치', '개포', '수서', '코엑스', '테헤란로'],
  '송파구': ['송파', '잠실', '문정', '가락', '방이', '석촌', '올림픽공원', '롯데월드'],
  '강동구': ['강동', '천호', '길동', '둔촌', '암사', '명일', '고덕'],
};

// ─── 동음이의어: 출산·양육 맥락에서 지명이 아닌 뜻으로 더 자주 쓰이는 키워드 ──
// 이 키워드 단독으로는 구를 특정하지 않음. 같은 구의 다른 확실한 키워드가 함께 있어야 인정
export const AMBIGUOUS_DISTRICT_KEYWORDS = new Set([
  '수유',    // 수유동(강북구) vs 모유수유/수유실
  '방학',    // 방학동(도봉구) vs 방학(학교 방학)
  '신월',    // 신월동(양천구) vs 여의신월(지하차도) 등
  '방이',    // 방이동(송파구) vs 방이/방에
  '보문',    // 보문동(성북구) vs 보문(일반)
  '가산',    // 가산동(금천구) vs 가산점/가산(추가)
  '구의',    // 구의동(광진구) vs "각 구의 보건소" 등 조사 용법
]);

// ─── 담당자 피드백 기반 동음이의어 업데이트 가이드 ──────────────────
// 담당자 피드백 로그(localStorage 'district_feedback_log')에서 오매칭 유형이
// 반복되면 이 목록에 추가해야 합니다.
// API 연동 시: GET /api/feedback/ambiguous-keywords → 이 Set과 머지하여 사용
// 예시: fetchAmbiguousKeywords().then(kws => kws.forEach(k => AMBIGUOUS_DISTRICT_KEYWORDS.add(k)));
export function applyFeedbackKeywords(keywords: string[]) {
  keywords.forEach(kw => AMBIGUOUS_DISTRICT_KEYWORDS.add(kw));
}

/**
 * 텍스트에서 자치구를 추정합니다.
 * 동음이의어 키워드는 같은 구의 확실한 키워드가 함께 있을 때만 인정합니다.
 *
 * @returns { district, score, keywords, solidCount }
 */
export function inferDistrict(text: string): {
  district: string;
  score: number;
  keywords: string[];
  solidCount: number;
} {
  let bestDistrict = '';
  let bestScore = 0;
  let bestSolidCount = 0;
  let bestKeywords: string[] = [];

  for (const [district, keywords] of Object.entries(DISTRICT_KEYWORDS)) {
    let score = 0;
    let solidCount = 0;
    const matched: string[] = [];

    for (const kw of keywords) {
      if (text.includes(kw)) {
        if (AMBIGUOUS_DISTRICT_KEYWORDS.has(kw)) {
          matched.push(kw);
        } else {
          score += kw.length;
          solidCount += 1;
          matched.push(kw);
        }
      }
    }

    // 동음이의어만 매칭 → 크게 감점
    if (solidCount === 0 && matched.length > 0) {
      score = matched.length * 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDistrict = district;
      bestSolidCount = solidCount;
      bestKeywords = solidCount > 0
        ? matched
        : matched.map(k => k + '(?)');
    }
  }

  return { district: bestDistrict, score: bestScore, keywords: bestKeywords, solidCount: bestSolidCount };
}
