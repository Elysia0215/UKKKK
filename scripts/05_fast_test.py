import requests
import json

SERVICE_KEY = "2BOebv4LMSyFeF371dGJhDpzY4s/1CsQeSR5S+CsdwrNKEd5SP+pvZFwrE4yUH/JkIdO+qBzHdMDzNqClrc2Jg=="
LIST_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalList"
ITEM_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalItem"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

KEYWORDS = ["출산", "육아", "보육"]

print("--- 05번 fast test 시작 ---")
for kw in KEYWORDS:
    params = {
        "serviceKey": SERVICE_KEY,
        "keyword": kw,
        "searchType": "title",
        "firstIndex": 1,
        "recordCountPerPage": 10,
    }
    try:
        r = requests.get(LIST_URL, params=params, headers=HEADERS, timeout=5)
        print(f"Keyword [{kw}] Status: {r.status_code}")
        print("Raw snippet:", r.text[:300])
    except Exception as e:
        print(f"Keyword [{kw}] Error: {e}")
