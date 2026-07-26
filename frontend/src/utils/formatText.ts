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

  // PDF/문서 복사 과정에서 단어 단위로 줄바꿈된 원문은 화면에서 문장형으로 복원한다.
  const lines = formatted.split('\n').map(line => line.trim());
  const nonEmptyLines = lines.filter(Boolean);
  const shortLineCount = nonEmptyLines.filter(line => line.length <= 14).length;
  const symbolOnlyLineCount = nonEmptyLines.filter(line => /^[○□◇※ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\-ㆍ·,.:()0-9\s]+$/.test(line)).length;
  const looksHardWrapped = (
    nonEmptyLines.length >= 20
    && (shortLineCount / nonEmptyLines.length >= 0.55 || symbolOnlyLineCount >= 5)
  );

  if (looksHardWrapped) {
    formatted = nonEmptyLines.reduce((acc, line) => {
      const isHeading = /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/.test(line)
        || /^[□◇○※]/.test(line)
        || /^(배경|현황 및 문제점|추진방안|추진일정|개선방안|기대효과|문제 상황|보유 현황)$/.test(line);
      const prev = acc[acc.length - 1] || '';
      const prevEndsSentence = /[.!?。]|다$|요$|함$/.test(prev);
      const lineIsPunctuation = /^[,.:;)\]]+$/.test(line);

      if (!acc.length) return [line];
      if (isHeading) return [...acc, '', line];
      if (lineIsPunctuation) {
        acc[acc.length - 1] = `${prev}${line}`;
        return acc;
      }
      if (prevEndsSentence) return [...acc, line];

      acc[acc.length - 1] = `${prev} ${line}`;
      return acc;
    }, [] as string[]).join('\n');

    formatted = formatted
      .replace(/\s+([,.:;!?%）)\]])/g, '$1')
      .replace(/([（([])\s+/g, '$1')
      .replace(/([0-9])\s+([.)])\s*/g, '$1$2 ')
      .replace(/\b([가-힣])\s+([)）])/g, '$1$2')
      .replace(/[ \t]{2,}/g, ' ');
  }

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
