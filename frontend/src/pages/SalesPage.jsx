import { useState, useMemo } from 'react'
import { useFetch } from '../hooks/useFetch'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const CATEGORIES = ['AIRism', 'Heattech', 'Outerwear', 'Tops']
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444']

export default function SalesPage() {
  const [category, setCategory] = useState('')
  const query = category ? `/api/sales?limit=365&category=${category}` : '/api/sales?limit=365'
  const { data, loading, error } = useFetch(query)

  // Aggregate daily → weekly totals for the line chart
  const lineData = useMemo(() => {
    if (!data) return null
    const byDate = {}
    data.forEach(row => {
      const d = row.sale_date.slice(0, 10)
      byDate[d] = (byDate[d] || 0) + Number(row.total_amount)
    })
    const sorted = Object.keys(byDate).sort()
    // Group into weeks
    const weeks = []
    const totals = []
    for (let i = 0; i < sorted.length; i += 7) {
      const slice = sorted.slice(i, i + 7)
      weeks.push(slice[0])
      totals.push(slice.reduce((s, d) => s + byDate[d], 0).toFixed(2))
    }
    return { labels: weeks, datasets: [{ label: 'Weekly Revenue ($)', data: totals, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3 }] }
  }, [data])

  // Aggregate by category for the donut
  const donutData = useMemo(() => {
    if (!data) return null
    const byCategory = {}
    data.forEach(row => {
      byCategory[row.category] = (byCategory[row.category] || 0) + Number(row.total_amount)
    })
    const labels = Object.keys(byCategory)
    return {
      labels,
      datasets: [{ data: labels.map(l => byCategory[l].toFixed(2)), backgroundColor: COLORS, borderWidth: 2 }],
    }
  }, [data])

  const totalRevenue = data ? data.reduce((s, r) => s + Number(r.total_amount), 0).toFixed(2) : 0
  const totalUnits   = data ? data.reduce((s, r) => s + r.quantity_sold, 0) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sales Overview</h2>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">${Number(totalRevenue).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Units Sold</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{Number(totalUnits).toLocaleString()}</p>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error   && <p className="text-red-500">Error: {error}</p>}

      {!loading && lineData && (
        <div className="grid grid-cols-3 gap-6">
          {/* Line Chart */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Weekly Revenue Trend</h3>
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>

          {/* Donut Chart */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Sales by Category</h3>
            <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      )}
    </div>
  )
}
