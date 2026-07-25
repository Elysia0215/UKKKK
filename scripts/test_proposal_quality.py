from __future__ import annotations

import unittest

from proposal_quality import (
    apply_quality_gate,
    classify_birth_policy_category,
    classify_birth_relevance,
    detect_outside_scope,
    is_placeholder_content,
    is_safe_policy_match,
    normalize_policy_tags,
    prepare_proposals,
    validate_proposals,
)


class ProposalQualityTests(unittest.TestCase):
    def test_placeholder_detects_title_repeat_and_url(self) -> None:
        self.assertTrue(is_placeholder_content("제목", "제목"))
        self.assertTrue(
            is_placeholder_content(
                "제목",
                "https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=1",
            )
        )

    def test_smoking_public_health_is_outside_scope(self) -> None:
        outside, _ = detect_outside_scope(
            "흡연 경범죄 추가",
            "간접흡연으로 임산부와 어린아이의 폐암 위험이 큽니다.",
        )
        self.assertTrue(outside)

    def test_maternal_smoking_support_remains_reviewable(self) -> None:
        outside, _ = detect_outside_scope(
            "임산부 금연 지원",
            "임산부 지원을 위한 금연 상담 서비스를 제안합니다.",
        )
        self.assertFalse(outside)

    def test_elderly_bus_proposal_is_outside_scope(self) -> None:
        outside, _ = detect_outside_scope(
            "노인의 안전한 버스 승하차",
            "노인 교통카드 태그 후 버스 승차와 하차를 안내합니다.",
        )
        self.assertTrue(outside)

    def test_policy_requires_two_distinct_shared_keywords(self) -> None:
        self.assertFalse(
            is_safe_policy_match(
                "영유아 부모 주차비용 지원",
                "영유아 동반 주차비를 지원해 주세요.",
                "어린이집 영유아 방문건강관리 서비스 지원",
            )
        )
        self.assertTrue(
            is_safe_policy_match(
                "난임 시술비 확대",
                "난임부부의 시술비 부담을 줄이고 지원 대상을 확대해 주세요.",
                "난임부부 시술비 지원",
            )
        )

    def test_unsafe_connections_are_cleared(self) -> None:
        item = {
            "id": "PROP-1",
            "title": "영유아 부모 주차비",
            "content": "영유아 부모 주차비",
            "department": ["저출생사업1팀"],
            "department_rankings": [{"rank": 1}],
            "matched_policies": [{"policy_name": "무관 정책"}],
        }
        apply_quality_gate(item)
        self.assertEqual(item["connection_status"], "source_missing")
        self.assertEqual(item["department"], [])
        self.assertEqual(item["department_rankings"], [])
        self.assertEqual(item["matched_policies"], [])

    def test_prepare_excludes_out_of_scope(self) -> None:
        prepared = prepare_proposals(
            [
                {
                    "id": "PROP-1",
                    "title": "노인 버스 승하차",
                    "content": "노인이 버스 교통카드로 승차하고 하차합니다.",
                },
                {
                    "id": "PROP-2",
                    "title": "난임 시술비 지원 확대",
                    "content": "난임부부 시술비 지원 대상을 확대해 주세요.",
                },
            ]
        )
        self.assertEqual([item["id"] for item in prepared], ["PROP-2"])

    def test_validation_catches_duplicate_and_url_mismatch(self) -> None:
        errors = validate_proposals(
            [
                {"id": "PROP-1", "url": "https://x?sn=2"},
                {"id": "PROP-1", "url": "https://x?sn=1"},
            ]
        )
        self.assertTrue(any("duplicate" in error for error in errors))
        self.assertTrue(any("URL sn mismatch" in error for error in errors))

    def test_forest_experience_is_childcare_play_space(self) -> None:
        self.assertEqual(
            classify_birth_policy_category(
                "유아숲체험원 운영 용역사업 평가 개선 건의문",
                "영유아를 대상으로 하는 숲 현장 활동입니다.",
            ),
            ("보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·유아숲·수유실"),
        )

    def test_civil_api_weak_child_facility_goes_to_review_or_exclude(self) -> None:
        self.assertEqual(
            classify_birth_relevance(
                "자양한강도서관 스포츠센터 건립",
                "아이들이 이용할 수 있는 생활SOC입니다.",
            )[0],
            "exclude",
        )
        self.assertEqual(
            classify_birth_relevance(
                "문화센터 수유실 설치",
                "영유아 부모를 위해 기저귀갈이대와 수유실을 설치해 주세요.",
            )[0],
            "include",
        )

    def test_normalize_policy_tags_rewrites_dashboard_fields(self) -> None:
        item = {
            "title": "유아숲체험원 운영 용역사업 평가 개선 건의문",
            "content": "영유아 발달 특성과 안전을 반영해야 합니다.",
            "category": "정보·상담·교육·거버넌스",
            "sub_category": "정보 접근성",
            "micro_category": "일반 출산정책 안건",
        }
        normalize_policy_tags(item)
        self.assertEqual(item["category"], "보육·돌봄 인프라")
        self.assertEqual(item["policy_flow"], "영유아기")


if __name__ == "__main__":
    unittest.main()
