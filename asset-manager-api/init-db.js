import db from './db/db.js'

const insert = db.prepare(`
  INSERT INTO assets_master (name, type, symbol, description, country, sector, listed)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const sampleAssets = [
  ['삼성전자', 'stock', '005930.KQ', '대한민국 대표 반도체 기업', 'KR', 'IT', 1],
  ['애플', 'stock', 'AAPL', '아이폰과 맥으로 유명한 글로벌 테크 기업', 'US', 'Technology', 1],
  ['테슬라', 'stock', 'TSLA', '전기차 및 에너지 기업', 'US', 'Automobile', 1],
  ['LG에너지솔루션', 'stock', '373220.KQ', '이차전지 제조 전문 기업', 'KR', 'Battery', 1],
  ['현대자동차', 'stock', '005380.KQ', '자동차 제조 및 수출 기업', 'KR', 'Automobile', 1]
]

for (const asset of sampleAssets) {
  insert.run(...asset)
}

console.log('✅ 샘플 자산 데이터 삽입 완료')
