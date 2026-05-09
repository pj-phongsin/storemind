import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import SalesPage from './pages/SalesPage'
import InventoryPage from './pages/InventoryPage'
import RosterPage from './pages/RosterPage'
import ForecastPage from './pages/ForecastPage'
import AgentPage from './pages/AgentPage'
import DWSPage from './pages/DWSPage'

export default function App() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/agent"    element={<AgentPage />} />
          <Route path="/dws"      element={<DWSPage />} />
        </Routes>
      </main>
    </div>
  )
}
