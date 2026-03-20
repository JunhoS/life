import db from './db.js'

const mappings = [
  // 매출액 (REVENUE)
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '매출액' },
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '영업수익' },
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '매출' },
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '수익(매출액)' },
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '영업수익(매출액)' },
  { standard_code: 'REVENUE', standard_name: '매출액', dart_account: '영업수입' },

  // 영업이익 (OP_INCOME)
  { standard_code: 'OP_INCOME', standard_name: '영업이익', dart_account: '영업이익' },
  { standard_code: 'OP_INCOME', standard_name: '영업이익', dart_account: '영업이익(손실)' },
  { standard_code: 'OP_INCOME', standard_name: '영업이익', dart_account: '영업손익' },

  // 당기순이익 (NET_INCOME)
  { standard_code: 'NET_INCOME', standard_name: '당기순이익', dart_account: '당기순이익' },
  { standard_code: 'NET_INCOME', standard_name: '당기순이익', dart_account: '당기순이익(손실)' },
  { standard_code: 'NET_INCOME', standard_name: '당기순이익', dart_account: '당기순이익(당기순손실)' },
  { standard_code: 'NET_INCOME', standard_name: '당기순이익', dart_account: '분기순이익' },
  { standard_code: 'NET_INCOME', standard_name: '당기순이익', dart_account: '분기순이익(손실)' },

  // 자산총계 (TOTAL_ASSETS)
  { standard_code: 'TOTAL_ASSETS', standard_name: '자산총계', dart_account: '자산총계' },
  { standard_code: 'TOTAL_ASSETS', standard_name: '자산총계', dart_account: '자산 합계' },

  // 부채총계 (TOTAL_LIAB)
  { standard_code: 'TOTAL_LIAB', standard_name: '부채총계', dart_account: '부채총계' },
  { standard_code: 'TOTAL_LIAB', standard_name: '부채총계', dart_account: '부채 합계' },

  // 자본총계 (TOTAL_EQUITY)
  { standard_code: 'TOTAL_EQUITY', standard_name: '자본총계', dart_account: '자본총계' },
  { standard_code: 'TOTAL_EQUITY', standard_name: '자본총계', dart_account: '자본 합계' },
  { standard_code: 'TOTAL_EQUITY', standard_name: '자본총계', dart_account: '지배기업소유주지분' },

  // 유동자산 (CURRENT_ASSETS)
  { standard_code: 'CURRENT_ASSETS', standard_name: '유동자산', dart_account: '유동자산' },

  // 유동부채 (CURRENT_LIAB)
  { standard_code: 'CURRENT_LIAB', standard_name: '유동부채', dart_account: '유동부채' },

  // 영업활동현금흐름 (CFO)
  { standard_code: 'CFO', standard_name: '영업활동현금흐름', dart_account: '영업활동으로 인한 현금흐름' },
  { standard_code: 'CFO', standard_name: '영업활동현금흐름', dart_account: '영업활동현금흐름' },
  { standard_code: 'CFO', standard_name: '영업활동현금흐름', dart_account: '영업활동으로인한현금흐름' },
]

const insert = db.prepare(`
  INSERT OR IGNORE INTO account_mapping (standard_code, standard_name, dart_account)
  VALUES (@standard_code, @standard_name, @dart_account)
`)

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row)
})

insertMany(mappings)
console.log(`✅ 계정과목 매핑 ${mappings.length}건 시드 완료`)
