"""
국민권익위 민원빅데이터 분석 API_2025 (minAnalsInfoView8)
- 키워드 기반 처리기관별 민원건수 조회 테스트
- mainSubCode=6110000 (서울특별시, 정부24 조직코드 기준 추정) 으로 시도

실행 위치: class_pjt/scripts/
"""
import requests

SERVICE_KEY = "2BOebv4LMSyFeF371dGJhDpzY4s/1CsQeSR5S+CsdwrNKEd5SP+pvZFwrE4yUH/JkIdO+qBzHdMDzNqClrc2Jg=="
URL = "https://apis.data.go.kr/1140100/minAnalsInfoView8/minPrcsInstInfo"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

params = {
    "serviceKey": SERVICE_KEY,
    "target": "pttn,dfpt,saeol",
    "searchword": "출산",
    "dateFrom": "20250101",
    "dateTo": "20260720",
    "mainSubCode": "6110000",   # 서울특별시 추정 코드 - 안 맞으면 다른 값 시도 필요
    "searchOption": "B0060005",
    "omitDuplicate": "true",
}

res = requests.get(URL, params=params, headers=HEADERS, timeout=20)
print(res.status_code)
print(res.text[:1500])
