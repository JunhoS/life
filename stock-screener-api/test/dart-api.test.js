/**
 * DART API 연결 테스트
 * node test/dart-api.test.js
 */
import 'dotenv/config'
import { fetchCompany, fetchFinancials, fetchAuditReportList, rateLimiter } from '../services/dartApi.js'
// DART Open API는 감사의견 텍스트를 JSON으로 직접 제공하지 않음.
// fetchAuditReportList는 list.json을 통해 공시 접수번호(rcept_no)를 반환함.

// 삼성전자 고유번호 (DART 대표 테스트 종목)
const SAMSUNG_CORP_CODE = '00126380'
const TEST_YEAR = 2024

let passed = 0
let failed = 0

function ok(label) {
  console.log(`  ✅ ${label}`)
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

// ── 1. API 키 설정 확인 ─────────────────────────────────────────────
await test('환경설정', () => {
  if (!process.env.DART_API_KEY) throw new Error('DART_API_KEY 미설정')
  ok(`API 키 확인: ${process.env.DART_API_KEY.slice(0, 8)}...`)
})

// ── 2. 기업 개황 조회 ────────────────────────────────────────────────
await test('기업 개황 (삼성전자)', async () => {
  const data = await fetchCompany(SAMSUNG_CORP_CODE)
  if (data.status && data.status !== '000') throw new Error(`DART 오류 ${data.status}: ${data.message}`)
  ok(`회사명: ${data.corp_name}`)
  ok(`종목코드: ${data.stock_code}`)
  ok(`시장: ${data.corp_cls === 'Y' ? '유가증권' : data.corp_cls}`)
  ok(`CEO: ${data.ceo_nm}`)
})

// ── 3. 재무제표 조회 ─────────────────────────────────────────────────
await test(`재무제표 (삼성전자 ${TEST_YEAR})`, async () => {
  const data = await fetchFinancials(SAMSUNG_CORP_CODE, TEST_YEAR, '11011', 'CFS')
  if (data.status && data.status !== '000') throw new Error(`DART 오류 ${data.status}: ${data.message}`)
  if (!data.list?.length) throw new Error('재무 데이터 없음')

  ok(`수신 계정수: ${data.list.length}개`)

  // 주요 계정 확인
  const find = (keyword) => data.list.find((r) => r.account_nm?.includes(keyword))
  const revenue = find('매출')
  const opIncome = find('영업이익')

  if (revenue) ok(`매출: ${Number(revenue.thstrm_amount?.replace(/,/g, '')).toLocaleString()}원`)
  else fail('매출액 계정 없음', '확인 필요')

  if (opIncome) ok(`영업이익: ${Number(opIncome.thstrm_amount?.replace(/,/g, '')).toLocaleString()}원`)
  else fail('영업이익 계정 없음', '확인 필요')

  // 상위 5개 계정명 출력
  console.log('  → 수신된 계정명 예시:')
  data.list.slice(0, 5).forEach((r) => console.log(`     • ${r.account_nm}`))
})

// ── 4. 감사보고서 공시목록 조회 ──────────────────────────────────────
// DART JSON API는 감사의견 텍스트를 직접 제공하지 않음.
// list.json으로 사업보고서 공시 목록(rcept_no)을 조회하는 방식 사용.
await test(`감사보고서 공시목록 (삼성전자 ${TEST_YEAR})`, async () => {
  const data = await fetchAuditReportList(SAMSUNG_CORP_CODE, TEST_YEAR)
  if (data.status && data.status !== '000') {
    if (data.status === '013') { ok(`공시 없음 (정상: ${data.message})`); return }
    throw new Error(`DART 오류 ${data.status}: ${data.message}`)
  }
  if (!data.list?.length) { ok('공시 목록 없음'); return }

  ok(`공시 ${data.list.length}건 수신`)
  data.list.forEach((item) =>
    console.log(`     • ${item.rcept_dt} [${item.rcept_no}] ${item.report_nm}`)
  )
  console.log('  ⚠️  감사의견 텍스트는 DART JSON API 미제공 → 접수번호로 문서 파싱 필요')
})

// ── 5. Rate Limiter 상태 확인 ────────────────────────────────────────
await test('Rate Limiter 상태', () => {
  ok(`오늘 사용: ${rateLimiter.dailyUsed}건`)
  ok(`오늘 잔여: ${rateLimiter.remainingToday}건`)
})

// ── 결과 요약 ────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40))
console.log(`결과: ✅ ${passed}개 통과 / ${failed > 0 ? `❌ ${failed}개 실패` : '실패 없음'}`)
if (failed > 0) process.exit(1)
