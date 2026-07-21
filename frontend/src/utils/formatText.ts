/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HTML Numeric Entity (&#x28; 등)를 일반 문자로 변환하는 유틸리티
 */
export function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#x28;/gi, '(')
    .replace(/&#x29;/gi, ')')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x22;/gi, '"')
    .replace(/&#x26;/gi, '&')
    .replace(/&#xA;/gi, '\n')
    .replace(/&#xD;/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * 시민 제안 및 민원 본문 텍스트의 엔터(줄바꿈) 및 단락 구조를 복원하고 가독성을 높이는 포맷팅 유틸리티
 */
export function formatProposalContent(content: string): string {
  if (!content) return '';

  let formatted = decodeHTMLEntities(content);

  // 1. 이중/삼중 공백("  ")을 줄바꿈 \n\n 으로 복원
  formatted = formatted.replace(/ {2,}/g, '\n\n');

  // 2. 주요 단락 구분의 헤더/항목 키워드 앞에 줄바꿈 추가
  const headerKeywords = [
    '보유 현황', '문제 상황', 'SH공사 기준의 한계', 'LH공사 기준의 한계',
    '첫째', '둘째', '셋째', '넷째', '다섯째',
    '청년 주거 안정', '출산율 제고 및 주거 상향 지원', '출산율 제고',
    '제도 개선 건의', '기대 효과', '건의 내용', '요청 사항', '참고 사항'
  ];

  headerKeywords.forEach(kw => {
    const regex = new RegExp(`(?<!\\n)(${kw}[:\\,]?)`, 'g');
    formatted = formatted.replace(regex, '\n\n$1');
  });

  // 3. 주요 문장 종결어미 뒤 단락 분할 (\n이 없는 연이은 장문인 경우)
  formatted = formatted.replace(/(부탁드립니다\.|사실입니다\.|있습니다\.|처지입니다\.|없습니다\.|원합니다\.|생각합니다\.|감사합니다\.|받는것입니다\.|지적됩니다\.)(?!\n)/g, '$1\n\n');

  // 4. 연속된 \n3개 이상을 \n\n으로 압축 및 여백 정리
  formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();

  return formatted;
}
