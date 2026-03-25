#!/usr/bin/env bash
# =========================================================
# DART 재무제표 배치 수집 스크립트
# 사용법: bash collect.sh [배치번호 1~4] [연도]
#
# 배치 구성 (1,000개씩):
#   1 → offset=0    (1~1,000번)
#   2 → offset=1000 (1,001~2,000번)
#   3 → offset=2000 (2,001~3,000번)
#   4 → offset=3000 (3,001~3,950번)
#
# 예시:
#   bash collect.sh 1 2024    # 1일차 배치 실행
#   bash collect.sh 2 2024    # 2일차 배치 실행
#   bash collect.sh all 2024  # 전체 수집 (배치 구분 없이)
# =========================================================

API="http://localhost:3002"
YEAR="${2:-2024}"
BATCH="${1:-1}"

check_server() {
  if ! curl -sf "$API/collect/status" > /dev/null 2>&1; then
    echo "[오류] 서버가 실행 중이지 않습니다. stock-screener-api 를 먼저 시작하세요."
    echo "  cd stock-screener-api && npm start"
    exit 1
  fi
}

collect_batch() {
  local OFFSET=$1
  local BATCH_SIZE=$2
  local DESC=$3

  echo ""
  echo "======================================================"
  echo " 재무제표 수집 — ${YEAR}년 | ${DESC}"
  echo " offset=${OFFSET}, batch_size=${BATCH_SIZE}"
  echo "======================================================"

  curl -s -X POST "$API/collect/financials" \
    -H "Content-Type: application/json" \
    -d "{\"year\": ${YEAR}, \"offset\": ${OFFSET}, \"batch_size\": ${BATCH_SIZE}}" \
    | python3 -m json.tool 2>/dev/null || \
    curl -s -X POST "$API/collect/financials" \
    -H "Content-Type: application/json" \
    -d "{\"year\": ${YEAR}, \"offset\": ${OFFSET}, \"batch_size\": ${BATCH_SIZE}}"

  echo ""
  echo "[안내] 백그라운드에서 수집 중입니다."
  echo "[안내] 진행 상황: curl $API/collect/status"
}

collect_all() {
  echo ""
  echo "======================================================"
  echo " 재무제표 전체 수집 — ${YEAR}년 (배치 구분 없음)"
  echo "======================================================"

  curl -s -X POST "$API/collect/financials" \
    -H "Content-Type: application/json" \
    -d "{\"year\": ${YEAR}}" \
    | python3 -m json.tool 2>/dev/null || \
    curl -s -X POST "$API/collect/financials" \
    -H "Content-Type: application/json" \
    -d "{\"year\": ${YEAR}}"

  echo ""
  echo "[안내] 백그라운드에서 수집 중입니다."
  echo "[안내] 진행 상황: curl $API/collect/status"
}

status() {
  echo ""
  echo "======================================================"
  echo " 수집 현황 조회"
  echo "======================================================"
  curl -s "$API/collect/status" \
    | python3 -m json.tool 2>/dev/null || \
    curl -s "$API/collect/status"
  echo ""
}

check_server

case "$BATCH" in
  1)   collect_batch 0    1000 "1배치 (1~1,000번)" ;;
  2)   collect_batch 1000 1000 "2배치 (1,001~2,000번)" ;;
  3)   collect_batch 2000 1000 "3배치 (2,001~3,000번)" ;;
  4)   collect_batch 3000 1000 "4배치 (3,001~3,950번)" ;;
  all) collect_all ;;
  status) status ;;
  *)
    echo "사용법: bash collect.sh [1|2|3|4|all|status] [연도]"
    echo ""
    echo "  bash collect.sh 1 2024      # 1배치 (1~1,000번)"
    echo "  bash collect.sh 2 2024      # 2배치 (1,001~2,000번)"
    echo "  bash collect.sh 3 2024      # 3배치 (2,001~3,000번)"
    echo "  bash collect.sh 4 2024      # 4배치 (3,001~3,950번)"
    echo "  bash collect.sh all 2024    # 전체 수집"
    echo "  bash collect.sh status      # 수집 현황 확인"
    exit 1
    ;;
esac
