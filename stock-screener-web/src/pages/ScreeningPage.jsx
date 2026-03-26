import { useState, useEffect } from 'react'
import FilterPanel from '../components/FilterPanel'
import ResultTable from '../components/ResultTable'
import { screening } from '../api/screenerApi'

const SESSION_KEY = 'screeningState'

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function ScreeningPage() {
  const saved = loadSession()

  const [result, setResult] = useState(saved?.result ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFilters, setLastFilters] = useState(saved?.lastFilters ?? {})

  // 상태 변경 시마다 sessionStorage에 저장
  useEffect(() => {
    if (result || Object.keys(lastFilters).length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, lastFilters }))
    }
  }, [result, lastFilters])

  const handleSearch = async (filters) => {
    setLoading(true)
    setError(null)
    setLastFilters(filters)
    try {
      const params = { ...filters }
      delete params.fiscal_year  // 더 이상 사용하지 않음
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

      <FilterPanel onSearch={handleSearch} loading={loading} initialFilters={saved?.lastFilters} />

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
