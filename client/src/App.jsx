
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/login/login.jsx'
import PlayerLoginPage from './pages/login/playerLogin.jsx'
import StaffLoginPage from './pages/login/staffLogin.jsx'
import MenuPage from './pages/menu/menu.jsx'
import OrderStatusPage from './pages/order-status/orderStatus.jsx'
import StaffDashboardPage from './pages/staff/dashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/player" element={<PlayerLoginPage />} />
        <Route path="/login/staff" element={<StaffLoginPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/order-status" element={<OrderStatusPage />} />
        <Route path="/staff" element={<StaffDashboardPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
