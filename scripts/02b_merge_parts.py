"""
2b단계: 4명이 각자 만든 part_1~4.csv를 하나로 병합
입력: data/raw/part_1.csv ~ part_4.csv (없는 번호는 자동으로 건너뜀)
출력: data/processed/상상대로_서울_출산육아_본문포함.csv
"""
import pandas as pd
from pathlib import Path

RAW_DIR = Path("../data/raw")
OUT_PATH = Path("../data/processed/상상대로_서울_출산육아_본문포함.csv")

if __name__ == "__main__":
    parts = sorted(RAW_DIR.glob("part_*.csv"))
    if not parts:
        raise FileNotFoundError("data/raw/ 안에 part_*.csv가 하나도 없어요. 각자 스크래핑부터 실행해주세요.")

    dfs = [pd.read_csv(p) for p in parts]
    df_all = pd.concat(dfs, ignore_index=True)

    before = len(df_all)
    df_all = df_all.drop_duplicates(subset="SN")
    after = len(df_all)
    if before != after:
        print(f"중복 SN {before - after}건 제거함 (같은 건을 두 명이 겹쳐 처리한 경우)")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_all.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print(f"병합 완료: {len(parts)}개 파일 -> 총 {len(df_all)}건")
    print(f"저장 위치: {OUT_PATH}")
    print(f"본문 확보: {df_all['content_full'].notna().sum()}건")
    print(f"에러: {df_all['error'].notna().sum()}건")
