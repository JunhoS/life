import { useState } from 'react'

const DEFAULT_FILTERS = {
  corp_cls: '',
  sector: '',
  opinion: '',
  going_concern: '',
  min_REVENUE: '',
  min_OP_INCOME_RATIO: '',
  max_DEBT_RATIO: '',
  min_REVENUE_GROWTH: '',
}

export default function FilterPanel({ onSearch, loading, initialFilters }) {
  const [f, setF] = useState(initialFilters ?? DEFAULT_FILTERS)

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch({ ...f, page: 1 })
  }

  const handleReset = () => {
    setF(DEFAULT_FILTERS)
    onSearch({ ...DEFAULT_FILTERS, page: 1 })
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          {/* 시장 구분 */}
          <div className="form-group">
            <label>시장</label>
            <select value={f.corp_cls} onChange={set('corp_cls')}>
              <option value="">전체</option>
              <option value="Y">유가증권</option>
              <option value="K">코스닥</option>
              <option value="N">코넥스</option>
            </select>
          </div>

          {/* 업종 */}
          <div className="form-group">
            <label>업종 검색</label>
            <input
              type="text"
              placeholder="IT, 바이오 등"
              value={f.sector}
              onChange={set('sector')}
              style={{ minWidth: 120 }}
            />
          </div>

          <hr className="divider" style={{ width: '100%', margin: '8px 0' }} />

          {/* 감사의견 */}
          <div className="form-group">
            <label>감사의견</label>
            <select value={f.opinion} onChange={set('opinion')}>
              <option value="">전체</option>
              <option value="적정">적정</option>
              <option value="한정">한정</option>
              <option value="부적정">부적정</option>
              <option value="의견거절">의견거절</option>
            </select>
          </div>

          {/* 계속기업 */}
          <div className="form-group">
            <label>계속기업 불확실성</label>
            <select value={f.going_concern} onChange={set('going_concern')}>
              <option value="">전체</option>
              <option value="0">없음</option>
              <option value="1">있음</option>
            </select>
          </div>

          <hr className="divider" style={{ width: '100%', margin: '8px 0' }} />

          {/* 재무 필터 */}
          <div className="form-group">
            <label>최소 매출액 (억원)</label>
            <input
              type="number"
              placeholder="예: 1000"
              value={f.min_REVENUE}
              onChange={set('min_REVENUE')}
              min={0}
              style={{ minWidth: 130 }}
            />
          </div>

          <div className="form-group">
            <label>최소 영업이익률 (%)</label>
            <input
              type="number"
              placeholder="예: 10"
              value={f.min_OP_INCOME_RATIO}
              onChange={set('min_OP_INCOME_RATIO')}
              min={-100}
              max={100}
              style={{ minWidth: 130 }}
            />
          </div>

          <div className="form-group">
            <label>최대 부채비율 (%)</label>
            <input
              type="number"
              placeholder="예: 200"
              value={f.max_DEBT_RATIO}
              onChange={set('max_DEBT_RATIO')}
              min={0}
              style={{ minWidth: 130 }}
            />
          </div>

          <div className="form-group">
            <label>최소 매출 성장률 (%)</label>
            <input
              type="number"
              placeholder="예: 20"
              value={f.min_REVENUE_GROWTH}
              onChange={set('min_REVENUE_GROWTH')}
              style={{ minWidth: 130 }}
            />
          </div>
        </div>

        <div className="form-row mt-16" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={handleReset}>초기화</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '검색 중...' : '스크리닝'}
          </button>
        </div>
      </form>
    </div>
  )
}
