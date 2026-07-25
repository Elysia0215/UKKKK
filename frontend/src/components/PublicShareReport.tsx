import React from 'react';

interface PublicShareProposal {
  category: string;
  title: string;
  quote: string;
  content: string;
}

interface Props {
  proposalCount: number;
  topCategoryName: string;
  topVotedCategory: string;
  proposals: PublicShareProposal[];
}

const METRICS = [
  { label: '총 활성 사용자', value: '7,259', change: '26.1% 감소' },
  { label: '재방문자', value: '3,592명', change: '19.43% 감소' },
  { label: '신규 방문자', value: '6,648명', change: '26.08% 감소' },
  { label: '조회수', value: '110,015', change: '25% 감소' },
];

const categoryClass = (category: string) => {
  if (category.includes('출산') || category.includes('임신')) return 'bg-rose-500';
  if (category.includes('돌봄') || category.includes('보육')) return 'bg-blue-500';
  return 'bg-[#58c870]';
};

const summaryValueClass = (value: string) =>
  value.length > 8
    ? 'text-[15px] leading-[1.35] tracking-[-0.04em]'
    : value.length > 5
      ? 'text-[20px] leading-[1.25] tracking-[-0.03em]'
      : 'text-[26px] leading-none tracking-[-0.02em]';

const ReportHeader: React.FC<{ period: string; compact?: boolean }> = ({ period, compact = false }) => (
  <header className={`flex items-start justify-between ${compact ? 'mb-5' : 'mb-0'}`}>
    <div>
      <img
        src="/sangsang-logo.png"
        alt="상상대로서울"
        className={compact ? 'h-auto w-[88px]' : 'h-auto w-[184px]'}
      />
      {!compact && (
        <p className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-[#54b97a]">
          데이터로 보는 상상대로서울
        </p>
      )}
    </div>
    <span className="font-mono text-[18px] font-black tracking-[0.03em] text-[#667477]">{period}</span>
  </header>
);

const PageNumber: React.FC<{ value: number }> = ({ value }) => (
  <span className="absolute inset-x-0 bottom-[18px] text-center text-[10px] font-black text-[#667477]">
    {String(value).padStart(2, '0')}
  </span>
);

export const PublicShareReport: React.FC<Props> = ({
  proposalCount,
  topCategoryName,
  topVotedCategory,
  proposals,
}) => {
  const now = new Date();
  const period = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
  const proposalPages = [proposals.slice(0, 6), proposals.slice(6, 12)].filter((items) => items.length > 0);

  return (
    <div className="public-share-report mx-auto flex w-full flex-col items-center gap-5 text-[#343c3e]">
      <section className="report-print-page relative min-h-[1018px] w-[720px] max-w-full overflow-hidden bg-[#e7ecec] shadow-sm">
        <div className="px-[38px] pb-4 pt-[28px]">
          <ReportHeader period={period} />
        </div>

        <div
          className="h-[465px] bg-cover bg-center"
          style={{ backgroundImage: 'url(/report_hero_bg.jpg)' }}
          role="img"
          aria-label="상상대로서울 캐릭터들이 데이터를 살펴보는 밝은 사무실"
        />

        <div className="relative z-10 mx-[36px] mt-[-34px] grid grid-cols-4 gap-[10px]">
          {METRICS.map((metric) => (
            <article
              key={metric.label}
              className="flex h-[150px] flex-col rounded-[11px] bg-white px-[18px] py-[20px]"
            >
              <span className="text-[11px] font-black">{metric.label}</span>
              <span className="mt-1 text-[12px] font-bold text-[#556265]">{metric.value}</span>
              <span className="mt-auto flex items-center gap-1 whitespace-nowrap text-[10px] font-black text-[#4c91d8]">
                <span className="shrink-0 text-[18px] leading-none" aria-hidden="true">↓</span>
                <span className="whitespace-nowrap">{metric.change}</span>
              </span>
            </article>
          ))}
        </div>

        <div className="mx-[36px] mt-[10px] grid grid-cols-4 gap-[10px]">
          <article className="flex h-[148px] flex-col rounded-[11px] bg-white px-[18px] py-[18px]">
            <span className="text-[11px] font-black">제안 수</span>
            <span className="mt-auto text-right text-[31px] font-black">
              {(proposalCount || 144).toLocaleString()}
            </span>
          </article>
          <article className="flex h-[148px] flex-col rounded-[11px] bg-white px-[18px] py-[18px]">
            <span className="max-w-[115px] text-[11px] font-black leading-[1.35]">
              제안이 가장 많은 정책 분야
            </span>
            <span
              className={`mt-auto flex min-h-[62px] items-end justify-end overflow-hidden break-keep text-right font-black ${summaryValueClass(topCategoryName)}`}
            >
              {topCategoryName}
            </span>
          </article>
          <article className="flex h-[148px] flex-col rounded-[11px] bg-white px-[18px] py-[18px]">
            <span className="max-w-[115px] text-[11px] font-black leading-[1.35]">
              공감이 가장 많은 정책 분야
            </span>
            <span
              className={`mt-auto flex min-h-[62px] items-end justify-end overflow-hidden break-keep text-right font-black ${summaryValueClass(topVotedCategory)}`}
            >
              {topVotedCategory}
            </span>
          </article>
          <article className="flex h-[148px] items-center justify-center rounded-[11px] bg-white text-[38px] text-[#88a091]">
            <span aria-hidden="true">→</span>
            <span className="sr-only">다음 페이지</span>
          </article>
        </div>
        <PageNumber value={1} />
      </section>

      {proposalPages.map((items, pageIndex) => (
        <section
          key={`proposal-page-${pageIndex}`}
          className="report-print-page relative min-h-[1018px] w-[720px] max-w-full overflow-hidden bg-[#e7ecec] px-[55px] pb-[55px] pt-[34px] shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <img src="/sangsang-logo.png" alt="상상대로서울" className="h-auto w-[68px]" />
              <h3 className="mt-1 text-[19px] font-black tracking-[-0.04em]">이런 제안은 어때요?</h3>
            </div>
            <span className="font-mono text-[18px] font-black tracking-[0.03em] text-[#667477]">{period}</span>
          </div>

          <div className="mt-[20px] grid grid-cols-2 gap-[16px]">
            {items.map((proposal, index) => (
              <article
                key={`${proposal.title}-${index}`}
                className="flex min-h-[250px] flex-col rounded-[11px] bg-white px-[18px] py-[16px]"
              >
                <span
                  className={`inline-flex w-fit min-w-[50px] justify-center rounded-full px-3 py-1 text-[10px] font-black text-white ${categoryClass(proposal.category)}`}
                >
                  {proposal.category}
                </span>
                <p className="mt-3 text-[9.5px] font-medium text-[#687477]">{proposal.quote}</p>
                <h4 className="mt-1 text-[13px] font-black leading-[1.45] tracking-[-0.02em] text-[#343c3e]">
                  {proposal.title}
                </h4>
                <p className="mt-6 line-clamp-6 text-[10px] font-medium leading-[1.75] text-[#5e696c]">
                  {proposal.content}
                </p>
              </article>
            ))}
          </div>
          <PageNumber value={pageIndex + 2} />
        </section>
      ))}
    </div>
  );
};
