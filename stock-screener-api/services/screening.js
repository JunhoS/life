import db from '../db/db.js'

// 스크리닝 쿼리 빌더
// Phase 1: 필터 조건에 필요한 JOIN만으로 corp_code 목록 추출 (LIMIT/OFFSET)
//          재무 JOIN은 각 회사별 최신 fiscal_year 기준으로 수행
// Phase 2: 해당 corp_code들에 대해서만 재무/감사 데이터 조회
export function runScreening(filters) {
  const {
    corp_cls,
    sector,
    opinion,
    going_concern,
    min_REVENUE,
    max_REVENUE,
    min_OP_INCOME,
    min_OP_INCOME_RATIO,   // 영업이익률 %, OP_INCOME / REVENUE * 100
    max_DEBT_RATIO,        // 부채비율 %, TOTAL_LIAB / TOTAL_EQUITY * 100
    min_REVENUE_GROWTH,    // 매출 성장률 %, 전년 대비
    page = 1,
    limit = 50,
  } = filters

  const offset = (Number(page) - 1) * Number(limit)

  // 재무 필터 사용 여부 (Phase 1 JOIN + WHERE 조건 결정에만 사용)
  const needsRevenue     = min_REVENUE || max_REVENUE || min_OP_INCOME_RATIO || min_REVENUE_GROWTH
  const needsOpIncome    = min_OP_INCOME || min_OP_INCOME_RATIO
  const needsDebtRatio   = max_DEBT_RATIO
  const needsPrevRevenue = min_REVENUE_GROWTH

  // 회사별 최신 연도 서브쿼리 헬퍼
  const latestYearSub = (stdCode) =>
    `(SELECT MAX(f2.fiscal_year) FROM financials f2
      WHERE f2.corp_code = c.corp_code
        AND f2.standard_code = '${stdCode}'
        AND f2.fs_div = 'CFS')`

  // ── Phase 1: 필터링 + 페이징 ────────────────────────────────────
  const p1Joins   = []
  const p1Wheres  = []
  const p1Params  = []

  // 감사의견도 최신 연도 기준으로
  p1Joins.push(`LEFT JOIN audit_opinions ao
    ON c.corp_code = ao.corp_code
    AND ao.fiscal_year = (
      SELECT MAX(ao2.fiscal_year) FROM audit_opinions ao2
      WHERE ao2.corp_code = c.corp_code
    )`)

  if (needsRevenue) {
    p1Joins.push(`LEFT JOIN financials f_rev
      ON c.corp_code = f_rev.corp_code
      AND f_rev.standard_code = 'REVENUE'
      AND f_rev.fs_div = 'CFS'
      AND f_rev.fiscal_year = ${latestYearSub('REVENUE')}`)
  }
  if (needsOpIncome) {
    p1Joins.push(`LEFT JOIN financials f_op
      ON c.corp_code = f_op.corp_code
      AND f_op.standard_code = 'OP_INCOME'
      AND f_op.fs_div = 'CFS'
      AND f_op.fiscal_year = ${latestYearSub('OP_INCOME')}`)
  }
  if (needsDebtRatio) {
    p1Joins.push(`LEFT JOIN financials f_liab
      ON c.corp_code = f_liab.corp_code
      AND f_liab.standard_code = 'TOTAL_LIAB'
      AND f_liab.fs_div = 'CFS'
      AND f_liab.fiscal_year = ${latestYearSub('TOTAL_LIAB')}`)
    p1Joins.push(`LEFT JOIN financials f_equity
      ON c.corp_code = f_equity.corp_code
      AND f_equity.standard_code = 'TOTAL_EQUITY'
      AND f_equity.fs_div = 'CFS'
      AND f_equity.fiscal_year = ${latestYearSub('TOTAL_EQUITY')}`)
  }
  if (needsPrevRevenue) {
    p1Joins.push(`LEFT JOIN financials f_prev_rev
      ON c.corp_code = f_prev_rev.corp_code
      AND f_prev_rev.standard_code = 'REVENUE'
      AND f_prev_rev.fs_div = 'CFS'
      AND f_prev_rev.fiscal_year = ${latestYearSub('REVENUE')} - 1`)
  }

  if (corp_cls) { p1Wheres.push('c.corp_cls = ?');     p1Params.push(corp_cls) }
  if (sector)   { p1Wheres.push('c.sector LIKE ?');     p1Params.push(`%${sector}%`) }
  if (opinion)  { p1Wheres.push('ao.opinion_type = ?'); p1Params.push(opinion) }
  if (going_concern !== undefined && going_concern !== '') {
    p1Wheres.push('ao.going_concern = ?')
    p1Params.push(Number(going_concern))
  }
  if (min_REVENUE)         { p1Wheres.push('f_rev.amount >= ?');  p1Params.push(Number(min_REVENUE)) }
  if (max_REVENUE)         { p1Wheres.push('f_rev.amount <= ?');  p1Params.push(Number(max_REVENUE)) }
  if (min_OP_INCOME)       { p1Wheres.push('f_op.amount >= ?');   p1Params.push(Number(min_OP_INCOME)) }
  if (min_OP_INCOME_RATIO) {
    p1Wheres.push('(CAST(f_op.amount AS REAL) / NULLIF(f_rev.amount, 0) * 100) >= ?')
    p1Params.push(Number(min_OP_INCOME_RATIO))
  }
  if (max_DEBT_RATIO) {
    p1Wheres.push('(CAST(f_liab.amount AS REAL) / NULLIF(f_equity.amount, 0) * 100) <= ?')
    p1Params.push(Number(max_DEBT_RATIO))
  }
  if (min_REVENUE_GROWTH) {
    p1Wheres.push('(CAST(f_rev.amount - f_prev_rev.amount AS REAL) / NULLIF(f_prev_rev.amount, 0) * 100) >= ?')
    p1Params.push(Number(min_REVENUE_GROWTH))
  }

  const p1Where = p1Wheres.length ? `WHERE ${p1Wheres.join(' AND ')}` : ''
  const p1Base  = `FROM companies c ${p1Joins.join('\n')} ${p1Where}`

  const { total } = db.prepare(`SELECT COUNT(*) AS total ${p1Base}`).get(...p1Params)

  const pageRows = db.prepare(`
    SELECT c.corp_code, c.corp_name, c.stock_code, c.corp_cls, c.sector
    ${p1Base}
    ORDER BY c.corp_name
    LIMIT ? OFFSET ?
  `).all(...p1Params, Number(limit), offset)

  if (pageRows.length === 0) {
    return { total, page: Number(page), limit: Number(limit), data: [] }
  }

  // ── Phase 2: 해당 페이지 corp_code들에 대해서만 최신 재무/감사 조회 ──
  const corpCodes    = pageRows.map(r => r.corp_code)
  const placeholders = corpCodes.map(() => '?').join(',')

  // 각 회사의 최신 fiscal_year 조회
  const latestYearRows = db.prepare(`
    SELECT corp_code, MAX(fiscal_year) AS latest_year
    FROM financials
    WHERE corp_code IN (${placeholders})
      AND standard_code = 'REVENUE'
      AND fs_div = 'CFS'
    GROUP BY corp_code
  `).all(...corpCodes)

  const latestYearMap = {}  // { corp_code: latest_year }
  for (const row of latestYearRows) latestYearMap[row.corp_code] = row.latest_year

  // 당기 재무 (각 회사별 최신 연도)
  const curFinRows = db.prepare(`
    SELECT f.corp_code, f.standard_code, f.amount, f.fiscal_year
    FROM financials f
    INNER JOIN (
      SELECT corp_code, MAX(fiscal_year) AS max_year
      FROM financials
      WHERE corp_code IN (${placeholders})
        AND standard_code IN ('REVENUE', 'OP_INCOME', 'TOTAL_LIAB', 'TOTAL_EQUITY')
        AND fs_div = 'CFS'
      GROUP BY corp_code
    ) latest ON f.corp_code = latest.corp_code AND f.fiscal_year = latest.max_year
    WHERE f.corp_code IN (${placeholders})
      AND f.standard_code IN ('REVENUE', 'OP_INCOME', 'TOTAL_LIAB', 'TOTAL_EQUITY')
      AND f.fs_div = 'CFS'
  `).all(...corpCodes, ...corpCodes)

  // 전기 매출 (최신 연도 - 1)
  // corp_code별 최신 연도가 다를 수 있으므로 개별 처리
  const prevRevMap = {}
  if (Object.keys(latestYearMap).length > 0) {
    // (corp_code, fiscal_year) 쌍으로 조회
    const prevRevRows = db.prepare(`
      SELECT corp_code, amount, fiscal_year
      FROM financials
      WHERE corp_code IN (${placeholders})
        AND standard_code = 'REVENUE'
        AND fs_div = 'CFS'
        AND fiscal_year IN (
          SELECT MAX(fiscal_year) - 1
          FROM financials f2
          WHERE f2.corp_code = financials.corp_code
            AND f2.standard_code = 'REVENUE'
            AND f2.fs_div = 'CFS'
        )
    `).all(...corpCodes)
    for (const row of prevRevRows) prevRevMap[row.corp_code] = row.amount
  }

  // 감사의견 (최신 연도 기준)
  const auditRows = db.prepare(`
    SELECT ao.corp_code, ao.opinion_type, ao.going_concern, ao.auditor_name, ao.fiscal_year
    FROM audit_opinions ao
    INNER JOIN (
      SELECT corp_code, MAX(fiscal_year) AS max_year
      FROM audit_opinions
      WHERE corp_code IN (${placeholders})
      GROUP BY corp_code
    ) latest ON ao.corp_code = latest.corp_code AND ao.fiscal_year = latest.max_year
    WHERE ao.corp_code IN (${placeholders})
  `).all(...corpCodes, ...corpCodes)

  // corp_code 기준 맵 생성
  const finMap = {}  // { corp_code: { REVENUE: n, OP_INCOME: n, ... } }
  for (const row of curFinRows) {
    if (!finMap[row.corp_code]) finMap[row.corp_code] = {}
    finMap[row.corp_code][row.standard_code] = row.amount
  }

  const auditMap = {}
  for (const row of auditRows) auditMap[row.corp_code] = row

  // ── 데이터 조합 ──────────────────────────────────────────────────
  const data = pageRows.map(company => {
    const fin     = finMap[company.corp_code] || {}
    const audit   = auditMap[company.corp_code] || {}
    const rev     = fin['REVENUE']      ?? null
    const op      = fin['OP_INCOME']    ?? null
    const liab    = fin['TOTAL_LIAB']   ?? null
    const equity  = fin['TOTAL_EQUITY'] ?? null
    const prevRev = prevRevMap[company.corp_code] ?? null

    return {
      corp_code:     company.corp_code,
      corp_name:     company.corp_name,
      stock_code:    company.stock_code,
      corp_cls:      company.corp_cls,
      sector:        company.sector,
      fiscal_year:   latestYearMap[company.corp_code] ?? null,
      opinion_type:  audit.opinion_type  ?? null,
      going_concern: audit.going_concern ?? null,
      auditor_name:  audit.auditor_name  ?? null,
      revenue:       rev  !== null ? String(rev)  : null,
      op_income:     op   !== null ? String(op)   : null,
      op_margin:     rev && op !== null
        ? Math.round(op / rev * 10000) / 100
        : null,
      debt_ratio:    liab !== null && equity
        ? Math.round(liab / equity * 10000) / 100
        : null,
      revenue_growth: prevRev && rev !== null
        ? Math.round((rev - prevRev) / Math.abs(prevRev) * 10000) / 100
        : null,
    }
  })

  return { total, page: Number(page), limit: Number(limit), data }
}
