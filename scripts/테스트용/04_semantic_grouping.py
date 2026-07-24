"""
허깅페이스 한국어 임베딩 모델(KR-SBERT)로 두 가지 문제를 해결:

1. 키워드 매칭의 한계 해결 — "난임치료"가 임신/보육 등 여러 카테고리 키워드에
   겹쳐서 걸리는 문제를, 카테고리별 "의미"를 벡터로 비교해서 더 정확하게 재분류
2. 유사 제안 그룹핑 — 문구는 다르지만 실제로 같은 문제를 말하는 제안들을
   자동으로 묶어서 "같은 이슈가 N번 반복 제기됨"을 보여줌

설치 필요: pip install sentence-transformers scikit-learn

실행 위치: class_pjt/정책/
입력: data/processed/상상대로_서울_출산육아_분류완료.csv (기존 키워드 매칭 결과)
출력: data/processed/상상대로_서울_출산육아_분류완료_v2.csv (category_semantic, cluster_id 컬럼 추가)
"""
import pandas as pd
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity

import sys
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "정책"))

IN_PATH = BASE_DIR / "data" / "processed" / "상상대로_서울_출산육아_분류완료.csv"
OUT_PATH = BASE_DIR / "data" / "processed" / "상상대로_서울_출산육아_분류완료_v2.csv"

MODEL_NAME = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"

# 카테고리별 "대표 설명 문장" - 키워드 나열보다 문장으로 주면 임베딩이 더 잘 잡음
CATEGORY_DESCRIPTIONS = {
    "임신": "난임 치료, 시험관 시술, 산전 검사, 임신부 건강 관리와 지원에 관한 이야기",
    "출산": "출산 비용, 산후조리, 출산휴가, 출산장려금 등 출산 관련 지원에 관한 이야기",
    "보육": "어린이집, 유치원, 아이돌봄, 돌봄교실 등 영유아 보육·돌봄 서비스에 관한 이야기",
    "다자녀": "다자녀 가정 혜택, 다둥이 카드, 신혼부부 지원, 다자녀 우대 정책에 관한 이야기",
    "위기임산부": "위기임산부, 미혼모, 한부모, 보호출산 등 취약 가정 지원에 관한 이야기",
    "다문화": "다문화 가정, 이주여성, 외국인 가정 지원에 관한 이야기",
}


def load_model() -> SentenceTransformer:
    print(f"모델 로딩 중: {MODEL_NAME} (최초 실행시 다운로드로 몇 분 걸릴 수 있음)")
    return SentenceTransformer(MODEL_NAME)


def reclassify_by_embedding(df: pd.DataFrame, model: SentenceTransformer) -> pd.DataFrame:
    """카테고리를 키워드 매칭 대신 임베딩 유사도로 재분류"""
    cat_labels = list(CATEGORY_DESCRIPTIONS.keys())
    cat_embeddings = model.encode(list(CATEGORY_DESCRIPTIONS.values()))

    texts = (df["TITLE"].fillna("") + " " + df["content_full"].fillna("")).str.slice(0, 300)
    prop_embeddings = model.encode(texts.tolist(), show_progress_bar=True)

    sims = cosine_similarity(prop_embeddings, cat_embeddings)
    best_idx = sims.argmax(axis=1)
    best_score = sims.max(axis=1)

    df["category_semantic"] = [cat_labels[i] for i in best_idx]
    df["category_semantic_score"] = best_score.round(3)

    # 점수가 너무 낮으면(애매한 케이스) "기타"로 남김 - 임계값은 데이터 보고 조정 가능
    THRESHOLD = 0.35
    df.loc[df["category_semantic_score"] < THRESHOLD, "category_semantic"] = "기타"

    return df, prop_embeddings


def group_similar_proposals(df: pd.DataFrame, embeddings: np.ndarray, distance_threshold: float = 0.25) -> pd.DataFrame:
    """유사도가 높은 제안끼리 같은 cluster_id로 묶기"""
    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=distance_threshold,
        metric="cosine",
        linkage="average",
    )
    labels = clustering.fit_predict(embeddings)
    df["cluster_id"] = labels

    cluster_sizes = df["cluster_id"].value_counts()
    df["cluster_size"] = df["cluster_id"].map(cluster_sizes)

    return df


if __name__ == "__main__":
    df = pd.read_csv(IN_PATH)
    model = load_model()

    print("\n1) 임베딩 기반 카테고리 재분류 중...")
    df, embeddings = reclassify_by_embedding(df, model)

    print("\n2) 유사 제안 그룹핑 중...")
    df = group_similar_proposals(df, embeddings)

    df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print(f"\n=== 결과 ===")
    print(f"총 {len(df)}건")
    print("\n기존 키워드 분류 vs 임베딩 분류 - 달라진 건수:")
    changed = (df["category"] != df["category_semantic"]).sum()
    print(f"{changed}건 재분류됨 ({changed/len(df)*100:.1f}%)")
    print("\n예시 (달라진 것 5개):")
    print(df[df["category"] != df["category_semantic"]][["TITLE", "category", "category_semantic", "category_semantic_score"]].head(5).to_string())

    print(f"\n유사 제안 그룹 수: {df['cluster_id'].nunique()}개 그룹 (전체 {len(df)}건)")
    print("가장 큰 그룹 TOP 5 (같은 이슈가 반복 제기된 것):")
    top_clusters = df[df["cluster_size"] > 1].groupby("cluster_id").agg(
        size=("cluster_size", "first"),
        sample_title=("TITLE", "first"),
    ).sort_values("size", ascending=False).head(5)
    print(top_clusters.to_string())
