import db from '../db/db.js'

// DB에서 매핑 테이블을 메모리에 캐시 (서버 시작 시 1회 로드)
let mappingCache = null

function loadCache() {
  const rows = db.prepare('SELECT dart_account, standard_code FROM account_mapping').all()
  mappingCache = new Map(rows.map((r) => [r.dart_account, r.standard_code]))
}

export function getStandardCode(dartAccount) {
  if (!mappingCache) loadCache()
  return mappingCache.get(dartAccount) ?? null
}

// 캐시 무효화 (매핑 추가 후 호출)
export function invalidateCache() {
  mappingCache = null
}

const stmtUpsertUnmapped = db.prepare(`
  INSERT INTO unmapped_accounts (dart_account, occurrence_count, sample_corp)
  VALUES (@dart_account, 1, @sample_corp)
  ON CONFLICT(dart_account) DO UPDATE SET
    occurrence_count = occurrence_count + 1
`)

export function recordUnmapped(dartAccount, sampleCorp) {
  stmtUpsertUnmapped.run({ dart_account: dartAccount, sample_corp: sampleCorp })
}

// DART API 응답의 금액 문자열을 BigInt → Number 안전 처리
// SQLite INTEGER는 64비트이지만, better-sqlite3는 Number로 반환.
// Number.MAX_SAFE_INTEGER ≈ 9천조이므로 일반 기업 재무는 안전하나,
// 조 단위 초과 가능성을 위해 파싱 함수로 분리.
export function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  // "1,234,567,890" → 1234567890
  const cleaned = String(raw).replace(/,/g, '').trim()
  if (cleaned === '-' || cleaned === '') return null
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}
