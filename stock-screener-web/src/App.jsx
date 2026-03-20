import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ScreeningPage   from './pages/ScreeningPage'
import CompanyDetail   from './pages/CompanyDetail'
import AuditAlertsPage from './pages/AuditAlertsPage'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>DART</span> Screener
      </div>
      <NavLink to="/" end>스크리닝</NavLink>
      <NavLink to="/audit-alerts">감사의견 알림</NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"                      element={<ScreeningPage />} />
        <Route path="/audit-alerts"          element={<AuditAlertsPage />} />
        <Route path="/companies/:corpCode"   element={<CompanyDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
