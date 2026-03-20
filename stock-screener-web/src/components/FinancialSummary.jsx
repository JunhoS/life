import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatAmount } from '../api/screenerApi'

function toChartData(rows) {
  return [...rows].reverse().map((r) => ({
    year: `${r.fiscal_year}`,
    매출액: r.revenue ? Math.round(Number(r.revenue) / 1_0000_0000) : null,
    영업이익: r.op_income ? Math.round(Number(r.op_income) / 1_0000_0000) : null,
    당기순이익: r.net_income ? Math.round(Number(r.net_income) / 1_0000_0000) : null,
  }))
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--text)',
}

export default function FinancialSummary({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="empty">재무 데이터가 없습니다.</div>
  }

  const chartData = toChartData(rows)
  const latest = rows[0]

  // 최신 연도 주요 지표 계산
  const revenue = latest.revenue ? Number(latest.revenue) : null
  const opIncome = latest.op_income ? Number(latest.op_income) : null
  const netIncome = latest.net_income ? Number(latest.net_income) : null
  const totalAssets = latest.total_assets ? Number(latest.total_assets) : null
  const totalLiab = latest.total_liab ? Number(latest.total_liab) : null
  const totalEquity = latest.total_equity ? Number(latest.total_equity) : null

  const opMargin = revenue && opIncome ? ((opIncome / revenue) * 100).toFixed(1) : null
  const debtRatio = totalEquity && totalLiab ? ((totalLiab / totalEquity) * 100).toFixed(1) : null
  const roe = totalEquity && netIncome ? ((netIncome / totalEquity) * 100).toFixed(1) : null

  return (
    <div>
      {/* 주요 지표 */}
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-label">매출액 ({latest.fiscal_year})</div>
          <div className="stat-value">{formatAmount(latest.revenue)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">영업이익</div>
          <div className="stat-value" style={{ color: opIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatAmount(latest.op_income)}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">영업이익률</div>
          <div className="stat-value" style={{ color: opMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {opMargin !== null ? `${opMargin}%` : '-'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">당기순이익</div>
          <div className="stat-value" style={{ color: netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatAmount(latest.net_income)}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">자산총계</div>
          <div className="stat-value">{formatAmount(latest.total_assets)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">부채비율</div>
          <div className="stat-value" style={{ color: debtRatio > 200 ? 'var(--danger)' : 'var(--text)' }}>
            {debtRatio !== null ? `${debtRatio}%` : '-'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">ROE</div>
          <div className="stat-value" style={{ color: roe >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {roe !== null ? `${roe}%` : '-'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">영업현금흐름</div>
          <div className="stat-value">{formatAmount(latest.cfo)}</div>
        </div>
      </div>

      {/* 매출/이익 바차트 */}
      <div className="mt-24">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          연도별 매출액 · 영업이익 (억원)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}억`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v?.toLocaleString()}억`]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="매출액" fill="#4f7eff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="영업이익" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 순이익 라인차트 */}
      <div className="mt-24">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          연도별 당기순이익 (억원)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}억`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v?.toLocaleString()}억`]} />
            <Line type="monotone" dataKey="당기순이익" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
