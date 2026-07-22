# 📋 메인(`main`) 브랜치 대비 작업 변경사항 & 적용 가이드

이 문서는 `seonuk` 브랜치에서 작업된 주요 대시보드 UI 및 기능 개편 사항을 팀원이 본인의 작업 환경에 손쉽게 적용할 수 있도록 정리한 가이드입니다.

---

## 🚀 1. 적용 방법 (팀원용)

### 방법 A. 패치 파일로 1초 만에 자동 적용 (추천)

프로젝트 `frontend/` 폴더 위치에서 아래 명령어 한 줄을 실행하면 모든 변경 코드가 자동으로 적용됩니다.

```bash
git apply seonuk_changes.patch
```

> **참고**: 패치 적용 후 `npm run dev`로 변경된 대시보드를 바로 확인하실 수 있습니다.

---

## 🛠️ 2. 주요 변경사항 상세 내역

### 1) [신규 컴포넌트] `src/components/HoverScrollText.tsx`
* **기능**: 긴 텍스트 항목에 마우스를 올렸을 때(Hover) 부드럽게 가로 전광판 스크롤(Marquee)을 발생시키고, 끝부분에서 **3초간 정지** 후 재시작하는 사용자 친화적 컴포넌트.
* **특징**:
  * 텍스트 길이가 짤리지 않은 항목은 정지 상태 유지
  * 짤린 텍스트에만 호버 시 자동 작동하며, 쾌적한 속도로 스크롤 진행
  * `title` 속성이 포함되어 있어 즉시 툴팁 읽기도 지원

### 2) [대시보드 메인 레이아웃 개편] `src/components/DashboardOverview.tsx`
* **상단 KPI 영역 50:50 대칭 배치 구도**:
  * **좌측 그룹 (행정 & 기본 현황)**: 연한 테두리 외곽 박스로 묶고, 기존 4개 기본 지표를 **2줄 2칸 (2×2 격자)** 형태로 배치.
  * **소수점 정리**: 미답변 건수 카드의 문구를 `전체 제안의 약 92% 검토 대기중`과 같이 소수점 없이 반올림하여 깔끔하게 표시.
  * **우측 그룹 (시민 제안 핵심 인사이트)**: 연한 테두리 외곽 박스 내부에 **좌/우 50:50 반반** 구조로 2개의 인사이트 박스 배치.

* **신규 TOP 3 인사이트 카드 탑재**:
  * 📦 **최다 제안 분야 TOP 3**: 1위~3위 정책 분야 목록 + 미니 프로그래스 바(게이지) + 비중(%) 표시 (클릭 시 해당 분야 데이터 필터링)
  * 📦 **최고 공감 제안 TOP 3**: 1위~3위 최다 공감 표 수(🔥 N표) + 제안 제목 목록 (클릭 시 제안 원문 팝업 모달)
  * **전광판 스크롤 연동**: TOP 3 항목의 제목/분야명이 길 경우 `HoverScrollText`가 적용되어 호버 시 3초 정지 가로 스크롤 동작

---

## 📂 3. 신규 컴포넌트 코드 전문 (`HoverScrollText.tsx`)

팀원이 만약 수동으로 컴포넌트를 작성하고 싶다면 아래 코드를 `src/components/HoverScrollText.tsx` 파일로 저장하시면 됩니다:

```tsx
import React, { useRef, useState, useEffect } from 'react';

interface HoverScrollTextProps {
  text: string;
  className?: string;
}

export const HoverScrollText: React.FC<HoverScrollTextProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDist, setOverflowDist] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const checkOverflow = () => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      if (textWidth > containerWidth) {
        setOverflowDist(textWidth - containerWidth + 12);
      } else {
        setOverflowDist(0);
      }
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  // 스크롤 시간 + 3초 대기 + 0.4초 원복 타임라인
  const scrollTime = Math.max(1.5, overflowDist / 55); 
  const pauseTime = 3; 
  const resetTime = 0.4; 
  const totalTime = scrollTime + pauseTime + resetTime;

  const scrollPct = (scrollTime / totalTime) * 100;
  const pausePct = ((scrollTime + pauseTime) / totalTime) * 100;

  const keyframesStyle = `
    @keyframes marqueeHover_${Math.round(overflowDist)} {
      0% { transform: translateX(0px); }
      ${scrollPct.toFixed(1)}% { transform: translateX(-${overflowDist}px); }
      ${pausePct.toFixed(1)}% { transform: translateX(-${overflowDist}px); }
      100% { transform: translateX(0px); }
    }
  `;

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => {
        checkOverflow();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className="overflow-hidden whitespace-nowrap relative w-full"
      title={text}
    >
      <style>{keyframesStyle}</style>
      <span
        ref={textRef}
        className={`inline-block ${className} ${overflowDist === 0 ? 'truncate block w-full' : ''}`}
        style={{
          animation: isHovered && overflowDist > 0 
            ? `marqueeHover_${Math.round(overflowDist)} ${totalTime.toFixed(2)}s linear infinite` 
            : 'none',
          transform: isHovered && overflowDist > 0 ? undefined : 'translateX(0px)'
        }}
      >
        {text}
      </span>
    </div>
  );
};
```
