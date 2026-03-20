import db from '../db/db.js'

// 스크리닝 쿼리 빌더
// query params → WHERE 절 동적 생성 → 결과 반환
export function runScreening(filters) {
  const {
    fiscal_year,
    corp_cls,          // Y|K|N
    sector,
    opinion,           // 적정|한정|부적정|의견거절
    going_concern,     // 0|1
    // 재무 필터 (standard_code 기반, 원 단위)
    min_REVENUE,
    max_REVENUE,
    min_OP_INCOME,
    min_OP_INCOME_RATIO,   // 영업이익률 %, OP_INCOME / REVENUE * 100
    max_DEBT_RATIO,        // 부채비율 %, TOTAL_LIAB / TOTAL_EQUITY * 100
    min_REVENUE_GROWTH,    // 매출 성장률 %, 전년 대비
    // 페이징
    page = 1,
    limit = 50,
  } = filters

  const year = Number(fiscal_year) || new Date().getFullYear() - 1
  const offset = (Number(page) - 1) * Number(limit)

  // 재무 필터 사용 여부 확인
  const needsRevenue   = min_REVENUE || max_REVENUE || min_OP_INCOME_RATIO || min_REVENUE_GROWTH
  const needsOpIncome  = min_OP_INCOME || min_OP_INCOME_RATIO
  const needsLiab      = max_DEBT_RATIO
  const needsEquity    = max_DEBT_RATIO
  const needsPrevRevenue = min_REVENUE_GROWTH

  const joins = []
  const wheres = []
  const params = []

  // 감사의견 JOIN (기본 항상 포함)
  joins.push(`
    JOIN audit_opinions ao
      ON c.corp_code = ao.corp_code AND ao.fiscal_year = ?
  `)
  params.push(year)

  // 재무 JOIN: 필요한 standard_code별로 LEFT JOIN
  if (needsRevenue) {
    joins.push(`
      LEFT JOIN financials f_rev
        ON c.corp_code = f_rev.corp_code
        AND f_rev.fiscal_year = ?
        AND f_rev.standard_code = 'REVENUE'
        AND f_rev.fs_div = 'CFS'
    `)
    params.push(year)
  }

  if (needsOpIncome) {
    joins.push(`
      LEFT JOIN financials f_op
        ON c.corp_code = f_op.corp_code
        AND f_op.fiscal_year = ?
        AND f_op.standard_code = 'OP_INCOME'
        AND f_op.fs_div = 'CFS'
    `)
    params.push(year)
  }

  if (needsLiab) {
    joins.push(`
      LEFT JOIN financials f_liab
        ON c.corp_code = f_liab.corp_code
        AND f_liab.fiscal_year = ?
        AND f_liab.standard_code = 'TOTAL_LIAB'
        AND f_liab.fs_div = 'CFS'
    `)
    params.push(year)
  }

  if (needsEquity) {
    joins.push(`
      LEFT JOIN financials f_equity
        ON c.corp_code = f_equity.corp_code
        AND f_equity.fiscal_year = ?
        AND f_equity.standard_code = 'TOTAL_EQUITY'
        AND f_equity.fs_div = 'CFS'
    `)
    params.push(year)
  }

  if (needsPrevRevenue) {
    joins.push(`
      LEFT JOIN financials f_prev_rev
        ON c.corp_code = f_prev_rev.corp_code
        AND f_prev_rev.fiscal_year = ?
        AND f_prev_rev.standard_code = 'REVENUE'
        AND f_prev_rev.fs_div = 'CFS'
    `)
    params.push(year - 1)
  }

  // ── WHERE 조건 ───────────────────────────────────────────────────
  if (corp_cls) {
    wheres.push('c.corp_cls = ?')
    params.push(corp_cls)
  }

  if (sector) {
    wheres.push('c.sector LIKE ?')
    params.push(`%${sector}%`)
  }

  if (opinion) {
    wheres.push('ao.opinion_type = ?')
    params.push(opinion)
  }

  if (going_concern !== undefined && going_concern !== '') {
    wheres.push('ao.going_concern = ?')
    params.push(Number(going_concern))
  }

  if (min_REVENUE) {
    wheres.push('f_rev.amount >= ?')
    params.push(Number(min_REVENUE))
  }

  if (max_REVENUE) {
    wheres.push('f_rev.amount <= ?')
    params.push(Number(max_REVENUE))
  }

  if (min_OP_INCOME) {
    wheres.push('f_op.amount >= ?')
    params.push(Number(min_OP_INCOME))
  }

  if (min_OP_INCOME_RATIO) {
    // 영업이익률 = OP_INCOME / REVENUE * 100
    wheres.push('(CAST(f_op.amount AS REAL) / NULLIF(f_rev.amount, 0) * 100) >= ?')
    params.push(Number(min_OP_INCOME_RATIO))
  }

  if (max_DEBT_RATIO) {
    // 부채비율 = TOTAL_LIAB / TOTAL_EQUITY * 100
    wheres.push('(CAST(f_liab.amount AS REAL) / NULLIF(f_equity.amount, 0) * 100) <= ?')
    params.push(Number(max_DEBT_RATIO))
  }

  if (min_REVENUE_GROWTH) {
    // 매출 성장률 = (당기 - 전기) / 전기 * 100
    wheres.push('(CAST(f_rev.amount - f_prev_rev.amount AS REAL) / NULLIF(f_prev_rev.amount, 0) * 100) >= ?')
    params.push(Number(min_REVENUE_GROWTH))
  }

  const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''

  // ── SELECT ────────────────────────────────────────────────────────
  const selectCols = `
    c.corp_code,
    c.corp_name,
    c.stock_code,
    c.corp_cls,
    c.sector,
    ao.opinion_type,
    ao.going_concern,
    ao.auditor_name,
    ${needsRevenue   ? 'CAST(f_rev.amount AS TEXT) AS revenue,'    : 'NULL AS revenue,'}
    ${needsOpIncome  ? 'CAST(f_op.amount AS TEXT) AS op_income,'   : 'NULL AS op_income,'}
    ${needsRevenue && needsOpIncome
      ? 'ROUND(CAST(f_op.amount AS REAL) / NULLIF(f_rev.amount, 0) * 100, 2) AS op_margin,'
      : 'NULL AS op_margin,'}
    ${needsLiab && needsEquity
      ? 'ROUND(CAST(f_liab.amount AS REAL) / NULLIF(f_equity.amount, 0) * 100, 2) AS debt_ratio,'
      : 'NULL AS debt_ratio,'}
    ${needsPrevRevenue && needsRevenue
      ? 'ROUND(CAST(f_rev.amount - f_prev_rev.amount AS REAL) / NULLIF(f_prev_rev.amount, 0) * 100, 2) AS revenue_growth'
      : 'NULL AS revenue_growth'}
  `

  const baseQuery = `
    FROM companies c
    ${joins.join('\n')}
    ${whereClause}
  `

  const countRow = db.prepare(`SELECT COUNT(*) AS total ${baseQuery}`).get(...params)
  const total = countRow?.total ?? 0

  const rows = db.prepare(`
    SELECT ${selectCols}
    ${baseQuery}
    ORDER BY c.corp_name
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset)

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    fiscal_year: year,
    data: rows,
  }
}
