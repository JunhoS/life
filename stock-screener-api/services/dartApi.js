import 'dotenv/config'

const DART_BASE_URL = 'https://opendart.fss.or.kr/api'
const API_KEY = process.env.DART_API_KEY

// ── Rate Limiter ─────────────────────────────────────────────────────
// DART 제한: 분당 1,000건 / 일일 10,000건
// 안전 마진을 두어 분당 900건 / 일일 9,500건 기준으로 제어
class RateLimiter {
  constructor() {
    this.minIntervalMs = 70          // 호출 간 최소 간격 (ms) — 분당 ~857건
    this.dailyLimit = 9500
    this.dailyUsed = 0
    this.lastCallAt = 0
    this.resetDate = new Date().toDateString()
  }

  _resetIfNewDay() {
    const today = new Date().toDateString()
    if (today !== this.resetDate) {
      this.dailyUsed = 0
      this.resetDate = today
    }
  }

  get remainingToday() {
    this._resetIfNewDay()
    return this.dailyLimit - this.dailyUsed
  }

  isDailyLimitReached() {
    this._resetIfNewDay()
    return this.dailyUsed >= this.dailyLimit
  }

  async wait() {
    this._resetIfNewDay()
    const elapsed = Date.now() - this.lastCallAt
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed)
    }
    this.lastCallAt = Date.now()
    this.dailyUsed++
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const rateLimiter = new RateLimiter()

// ── API 호출 (지수 백오프 재시도) ─────────────────────────────────────
async function dartFetch(endpoint, params = {}, retries = 3) {
  if (rateLimiter.isDailyLimitReached()) {
    throw new DartDailyLimitError('일일 API 호출 한도 도달')
  }

  const url = new URL(`${DART_BASE_URL}/${endpoint}`)
  url.searchParams.set('crtfc_key', API_KEY)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    await rateLimiter.wait()
    try {
      const res = await fetch(url.toString())

      if (res.status === 429) {
        const delay = 2000 * attempt
        console.warn(`[DART] Rate limit (429) — ${delay}ms 후 재시도 (${attempt}/${retries})`)
        await sleep(delay)
        continue
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      // DART 자체 에러 코드
      if (data.status && data.status !== '000') {
        if (data.status === '010') {
          // 010: 미등록 인증키 → 재시도 무의미
          throw new DartApiError(`DART API 키 오류: ${data.message}`, data.status)
        }
        if (data.status === '020') {
          // 020: 일일 한도 초과
          rateLimiter.dailyUsed = rateLimiter.dailyLimit
          throw new DartDailyLimitError(`DART 일일 한도 초과: ${data.message}`)
        }
        if (data.status === '013') {
          // 013: 조회 데이터 없음 → 재시도해도 결과 동일, 즉시 반환
          return data
        }
        const delay = 2000 * Math.pow(2, attempt - 1)
        console.warn(`[DART] 에러 ${data.status} (${data.message}) — ${delay}ms 후 재시도 (${attempt}/${retries})`)
        await sleep(delay)
        continue
      }

      return data
    } catch (err) {
      if (err instanceof DartApiError || err instanceof DartDailyLimitError) throw err
      if (attempt === retries) throw err
      const delay = 2000 * Math.pow(2, attempt - 1)
      console.warn(`[DART] 네트워크 오류 — ${delay}ms 후 재시도 (${attempt}/${retries}): ${err.message}`)
      await sleep(delay)
    }
  }

  throw new Error(`[DART] ${endpoint} 최대 재시도 초과`)
}

export class DartApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export class DartDailyLimitError extends Error {}

// ── API 함수들 ─────────────────────────────────────────────────────
// 전체 상장사 고유번호 XML 다운로드 (zip 파일 → 별도 처리 필요)
export async function fetchCorpCodeZip() {
  if (rateLimiter.isDailyLimitReached()) {
    throw new DartDailyLimitError('일일 API 호출 한도 도달')
  }
  await rateLimiter.wait()
  const url = new URL(`${DART_BASE_URL}/corpCode.xml`)
  url.searchParams.set('crtfc_key', API_KEY)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`corpCode 다운로드 실패: HTTP ${res.status}`)
  return res.arrayBuffer()  // zip 파일 바이너리 반환
}

// 기업 개황
export async function fetchCompany(corpCode) {
  return dartFetch('company.json', { corp_code: corpCode })
}

// 단일회사 전체 재무제표 (fnlttSinglAcntAll: 주석포함 213개 계정, fnlttSinglAcnt: 주요 28개)
// reportCode: 11011(사업), 11012(반기), 11013(1분기), 11014(3분기)
// fsDiv: CFS(연결), OFS(개별)
export async function fetchFinancials(corpCode, year, reportCode = '11011', fsDiv = 'CFS') {
  return dartFetch('fnlttSinglAcntAll.json', {
    corp_code: corpCode,
    bsns_year: year,
    reprt_code: reportCode,
    fs_div: fsDiv,
  })
}

// 감사보고서 공시 목록 조회 (list.json 이용)
// DART Open API는 감사의견 텍스트를 JSON으로 직접 제공하지 않음.
// 대신 공시 목록에서 감사보고서 접수번호(rcept_no)를 조회하는 방식 사용.
export async function fetchAuditReportList(corpCode, year) {
  const yearStr = String(year)
  return dartFetch('list.json', {
    corp_code: corpCode,
    bgn_de: `${yearStr}0101`,
    end_de: `${yearStr}1231`,
    pblntf_ty: 'A',          // 정기공시
    pblntf_detail_ty: 'A001', // 사업보고서
    page_count: 10,
  })
}

// 하위 호환성 alias — collector.js에서 사용 (audit 수집 시 공시목록 반환)
export const fetchAuditOpinion = fetchAuditReportList
export const fetchAuditStatus  = fetchAuditReportList

// 시장구분(corp_cls) 배치 조회
// corp_code 없이 조회 시 최대 3개월 제한 → 분기별로 호출해야 함
// bgn, end: 'YYYYMMDD' 형식
export async function fetchCorpClsByMarket(corpCls, bgn, end, page = 1) {
  return dartFetch('list.json', {
    corp_cls: corpCls,    // Y|K|N|E
    bgn_de: bgn,
    end_de: end,
    pblntf_ty: 'A',      // 정기공시
    page_no: page,
    page_count: 100,
  })
}
