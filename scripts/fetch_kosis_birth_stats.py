import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TFR_CSV = BASE_DIR / "data" / "raw" / "합계출산율_및_모의_연령별_출산율_20260720.csv"
BIRTH_CSV = BASE_DIR / "data" / "raw" / "출산순위별_출생_20260720.csv"
DAYCARE_CSV = BASE_DIR / "data" / "raw" / "보육시설_현황_정원규모별_구별_20260720.csv"

def main():
    print("=" * 60)
    print("통계청(KOSIS) & 서울열린데이터광장 25개 자치구 출산/보육 통계 검증")
    print("=" * 60)

    tfr_df = pd.read_csv(TFR_CSV)
    birth_df = pd.read_csv(BIRTH_CSV)
    daycare_df = pd.read_csv(DAYCARE_CSV)

    print("\n1. 합계출산율 (TFR) 통계청 데이터:")
    print(tfr_df.head(10))

    print("\n2. 자치구별 출생아 수 통계청 데이터:")
    print(birth_df.head(10))

    print("\n3. 자치구별 보육시설 현황 데이터:")
    print(daycare_df.head(10))

if __name__ == "__main__":
    main()
