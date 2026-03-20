import { useState } from 'react'
import FilterPanel from '../components/FilterPanel'
import ResultTable from '../components/ResultTable'
import { screening } from '../api/screenerApi'

export default function ScreeningPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFilters, setLastFilters] = useState({})

  const handleSearch = async (filters) => {
    setLoading(true)
    setError(null)
    setLastFilters(filters)
    try {
      // 매출액: 억원 → 원 변환
      const params = { ...filters }
      if (params.min_REVENUE) params.min_REVENUE = Number(params.min_REVENUE) * 1_0000_0000
      const data = await screening(params)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page) => {
    handleSearch({ ...lastFilters, page })
  }

  return (
    <div className="page">
      <div className="page-title">주식 스크리닝</div>

      <FilterPanel onSearch={handleSearch} loading={loading} />

      <div className="mt-24">
        {loading && <div className="spinner">검색 중...</div>}
        {error && (
          <div className="card" style={{ color: 'var(--danger)', textAlign: 'center' }}>
            오류: {error}
          </div>
        )}
        {!loading && !error && result && (
          <div className="card">
            <ResultTable result={result} onPageChange={handlePageChange} />
          </div>
        )}
        {!loading && !error && !result && (
          <div className="empty">
            위 조건을 설정하고 스크리닝 버튼을 눌러주세요.
          </div>
        )}
      </div>
    </div>
  )
}
