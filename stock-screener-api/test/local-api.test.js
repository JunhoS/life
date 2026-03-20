/**
 * 로컬 Express API 테스트 (서버가 실행 중이어야 함)
 * node test/local-api.test.js
 */
import 'dotenv/config'

const BASE = `http://localhost:${process.env.PORT || 3002}`
const SAMSUNG = '00126380'

let passed = 0
let failed = 0

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function ok(label, detail = '') {
  console.log(`  ✅ ${label}${detail ? ` (${detail})` : ''}`)
  passed++
}
function fail(label, err) {
  console.log(`  ❌ ${label}: ${err?.message ?? err}`)
  failed++
}

async function test(label, fn) {
  process.stdout.write(`\n[${label}]\n`)
  try {
    await fn()
  } catch (e) {
    fail('예외 발생', e)
  }
}

// ── 0. 서버 기동 확인 ────────────────────────────────────────────────
await test('서버 헬스체크', async () => {
  const data = await get('/')
  ok(`상태: ${data.status}`, data.message)
})

// ── 1. 기업 목록 ─────────────────────────────────────────────────────
await test('GET /companies', async () => {
  const data = await get('/companies?limit=5')
  ok(`응답 구조: total, page, data 포함`, `total=${data.total}`)
  if (data.total === 0) {
    console.log('  ℹ️  DB에 기업 데이터가 없습니다. POST /collect/companies 실행 필요')
  } else {
    ok(`기업 목록 ${data.data.length}건 수신`)
    data.data.slice(0, 3).forEach((c) => console.log(`     • ${c.corp_name} (${c.stock_code})`))
  }
})

// ── 2. 기업 검색 ─────────────────────────────────────────────────────
await test('GET /companies?q=삼성', async () => {
  const data = await get('/companies?q=삼성&limit=5')
  ok(`검색 응답`, `total=${data.total}`)
  if (data.data?.length) {
    data.data.forEach((c) => console.log(`     • ${c.corp_name}`))
  }
})

// ── 3. 기업 상세 ─────────────────────────────────────────────────────
await test(`GET /companies/${SAMSUNG}`, async () => {
  try {
    const data = await get(`/companies/${SAMSUNG}`)
    ok(`기업명: ${data.corp_name}`)
    ok(`시장: ${data.corp_cls}`)
  } catch (e) {
    if (e.message.includes('404')) {
      console.log('  ℹ️  삼성전자 데이터 없음 (수집 전)')
    } else throw e
  }
})

// ── 4. 재무제표 ──────────────────────────────────────────────────────
await test(`GET /financials/${SAMSUNG}`, async () => {
  const data = await get(`/financials/${SAMSUNG}?year=2024`)
  if (data.length === 0) {
    console.log('  ℹ️  재무 데이터 없음 (수집 전)')
  } else {
    ok(`재무 항목 ${data.length}건`, `${data[0]?.fiscal_year}년`)
    data.slice(0, 3).forEach((r) => console.log(`     • ${r.account_name}: ${Number(r.amount).toLocaleString()}원`))
  }
})

// ── 5. 재무 요약 ─────────────────────────────────────────────────────
await test(`GET /financials/${SAMSUNG}/summary`, async () => {
  const data = await get(`/financials/${SAMSUNG}/summary`)
  if (data.length === 0) {
    console.log('  ℹ️  재무 요약 없음 (수집 전)')
  } else {
    ok(`${data.length}개 연도 요약 수신`)
  }
})

// ── 6. 감사의견 ──────────────────────────────────────────────────────
await test(`GET /audit/${SAMSUNG}`, async () => {
  const data = await get(`/audit/${SAMSUNG}`)
  if (data.length === 0) {
    console.log('  ℹ️  감사의견 없음 (수집 전)')
  } else {
    ok(`감사의견 ${data.length}건`)
    data.slice(0, 2).forEach((a) => console.log(`     • ${a.fiscal_year}년: ${a.opinion_type} (${a.auditor_name})`))
  }
})

// ── 7. 감사의견 알림 ──────────────────────────────────────────────────
await test('GET /audit/alerts', async () => {
  const data = await get('/audit/alerts?fiscal_year=2024')
  ok(`알림 응답`, `total=${data.total}`)
})

// ── 8. 스크리닝 ──────────────────────────────────────────────────────
await test('GET /screening (적정 + 코스닥)', async () => {
  const data = await get('/screening?opinion=적정&corp_cls=K&fiscal_year=2024&limit=5')
  ok(`스크리닝 응답`, `total=${data.total}, page=${data.page}`)
  if (data.data?.length) {
    data.data.slice(0, 3).forEach((r) => console.log(`     • ${r.corp_name} (${r.opinion_type})`))
  } else {
    console.log('  ℹ️  스크리닝 결과 없음 (데이터 수집 필요)')
  }
})

await test('GET /screening (영업이익률 10% 이상)', async () => {
  const data = await get('/screening?min_OP_INCOME_RATIO=10&fiscal_year=2024&limit=5')
  ok(`스크리닝 응답`, `total=${data.total}`)
})

// ── 9. 수집 상태 확인 ────────────────────────────────────────────────
await test('GET /collect/status', async () => {
  const data = await get('/collect/status')
  ok(`오늘 API 호출: ${data.api_calls_today}건`)
  ok(`잔여 할당량: ${data.remaining_today}건`)
  ok(`진행 기록: ${data.progresses.length}건`)
})

// ── 10. 미매핑 계정 확인 ─────────────────────────────────────────────
await test('GET /collect/unmapped', async () => {
  const data = await get('/collect/unmapped')
  ok(`미매핑 계정: ${data.length}건`)
  if (data.length > 0) {
    data.slice(0, 3).forEach((r) => console.log(`     • "${r.dart_account}" (${r.occurrence_count}회)`))
  }
})

// ── 결과 요약 ─────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40))
console.log(`결과: ✅ ${passed}개 통과 / ${failed > 0 ? `❌ ${failed}개 실패` : '실패 없음'}`)
if (failed > 0) process.exit(1)
