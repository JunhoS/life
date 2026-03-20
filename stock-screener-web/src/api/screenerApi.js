const BASE = '/api'

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API 오류: ${res.status}`)
  return res.json()
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API 오류: ${res.status}`)
  return res.json()
}

// ── 기업 ──────────────────────────────────────────────────────────
export const getCompanies = (params) => get('/companies', params)
export const getCompany = (corpCode) => get(`/companies/${corpCode}`)

// ── 재무제표 ────────────────────────────────────────────────────────
export const getFinancials = (corpCode, params) => get(`/financials/${corpCode}`, params)
export const getFinancialSummary = (corpCode, params) => get(`/financials/${corpCode}/summary`, params)

// ── 감사의견 ────────────────────────────────────────────────────────
export const getAudit = (corpCode) => get(`/audit/${corpCode}`)
export const getAuditAlerts = (params) => get('/audit/alerts', params)

// ── 스크리닝 ────────────────────────────────────────────────────────
export const screening = (params) => get('/screening', params)

// ── 수집 ────────────────────────────────────────────────────────────
export const getCollectStatus = () => get('/collect/status')
export const triggerCollectCompanies = () => post('/collect/companies')
export const triggerCollectFinancials = (body) => post('/collect/financials', body)
export const triggerCollectAudit = (body) => post('/collect/audit', body)
export const getUnmapped = () => get('/collect/unmapped')
export const addMapping = (body) => post('/collect/mapping', body)

// ── 포매팅 유틸 ────────────────────────────────────────────────────
export function formatAmount(raw) {
  if (raw === null || raw === undefined) return '-'
  const n = Number(raw)
  if (!Number.isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1_0000_0000_0000) return `${(n / 1_0000_0000_0000).toFixed(1)}조`
  if (abs >= 1_0000_0000)     return `${(n / 1_0000_0000).toFixed(0)}억`
  if (abs >= 1_0000)           return `${(n / 1_0000).toFixed(0)}만`
  return n.toLocaleString()
}

export function opinionBadge(type) {
  if (!type) return { cls: 'badge-gray', label: '-' }
  if (type === '적정')    return { cls: 'badge-green',  label: '적정' }
  if (type === '한정')    return { cls: 'badge-yellow', label: '한정' }
  if (type === '부적정')  return { cls: 'badge-red',    label: '부적정' }
  if (type === '의견거절') return { cls: 'badge-red',   label: '의견거절' }
  return { cls: 'badge-gray', label: type }
}

export function clsBadge(cls) {
  if (cls === 'Y') return { cls: 'badge-blue',  label: '유가' }
  if (cls === 'K') return { cls: 'badge-green', label: '코스닥' }
  if (cls === 'N') return { cls: 'badge-gray',  label: '코넥스' }
  return { cls: 'badge-gray', label: cls || '-' }
}
