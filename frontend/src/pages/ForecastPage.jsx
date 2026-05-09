import { useState, useMemo } from 'react'
import { useFetch } from '../hooks/useFetch'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const BASE = 'http://localhost:3001'

const CATEGORY_COLORS = {
  AIRism:    { border: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  Heattech:  { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  Outerwear: { border: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  Tops:      { border: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
}

const PRIORITY_STYLES = {
  P1: { bar: 'bg-red-500',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700',   label: 'P1 — Critical'   },
  P2: { bar: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', label: 'P2 — Supporting' },
  P3: { bar: 'bg-green-400', text: 'text-green-700', badge: 'bg-green-100 text-green-700', label: 'P3 — Flexible'  },
}

const EVENT_TYPES = ['Normal', 'Delivery', 'Sale', 'HighTraffic']

// ─── Forecast Chart ──────────────────────────────────────────────────────────
function ForecastChart({ days }) {
  const { data, loading, error } = useFetch(`/api/forecast?category=all&days=${days}`)

  const chartData = useMemo(() => {
    if (!data) return null
    const categories = ['AIRism', 'Heattech', 'Outerwear', 'Tops']
    const dates = [...new Set(data.map(d => d.date))].sort()
    const datasets = categories.map(cat => {
      const c = CATEGORY_COLORS[cat]
      return {
        label: cat,
        data: dates.map(date => {
          const row = data.find(d => d.date === date && d.category === cat)
          return row ? row.predicted_revenue : 0
        }),
        borderColor: c.border,
        backgroundColor: c.bg,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      }
    })
    return { labels: dates, datasets }
  }, [data])

  const totalByDate = useMemo(() => {
    if (!data) return []
    const map = {}
    data.forEach(d => { map[d.date] = (map[d.date] || 0) + d.predicted_revenue })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  const peakDay = totalByDate.length
    ? totalByDate.reduce((best, cur) => cur[1] > best[1] ? cur : best)
    : null

  const totalForecast = totalByDate.reduce((s, [, v]) => s + v, 0)

  return (
    <div>
      {loading && <p className="text-gray-500">Loading forecast...</p>}
      {error   && <p className="text-red-500">Error: {error} — is the ML service running on port 8000?</p>}

      {!loading && chartData && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm text-gray-500">Forecast Period</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{days} days</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm text-gray-500">Total Predicted Revenue</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">${totalForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm text-gray-500">Predicted Peak Day</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{peakDay ? peakDay[0] : '—'}</p>
              <p className="text-xs text-gray-400">${peakDay ? peakDay[1].toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</p>
            </div>
          </div>

          {/* Line chart */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Predicted Daily Revenue by Category</h3>
            <Line
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: false, ticks: { callback: v => `$${v.toLocaleString()}` } } },
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Task Allocation Panel ────────────────────────────────────────────────────
function TaskAllocation() {
  const [revenue, setRevenue]     = useState(3000)
  const [staff, setStaff]         = useState(10)
  const [eventType, setEventType] = useState('Normal')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${BASE}/api/forecast/task-allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predicted_revenue: Number(revenue), available_staff: Number(staff), event_type: eventType }),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      setResult(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const maxCount = result ? Math.max(...Object.values(result.allocation).map(v => v.count)) : 1

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Generate Auto-Task Allocation</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Predicted Revenue ($)</label>
          <input
            type="number"
            value={revenue}
            onChange={e => setRevenue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Available Staff</label>
          <input
            type="number"
            min="1"
            max="50"
            value={staff}
            onChange={e => setStaff(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Event Type</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {EVENT_TYPES.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Calculating...' : 'Generate Auto-Task'}
      </button>

      {error && <p className="text-red-500 text-sm mt-3">Error: {error}</p>}

      {result && (
        <div className="mt-6">
          {/* Traffic badge + recommendation */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
              result.traffic_level === 'high'   ? 'bg-red-100 text-red-700' :
              result.traffic_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                  'bg-green-100 text-green-700'
            }`}>
              {result.traffic_level} traffic
            </span>
            <span className="text-sm text-gray-600">{result.recommendation}</span>
          </div>

          {/* Allocation bars */}
          <div className="space-y-4">
            {Object.entries(result.allocation).map(([tier, info]) => {
              const s = PRIORITY_STYLES[tier]
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    <span className="text-xs text-gray-500">{info.count} staff ({Math.round(info.ratio * 100)}%)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                    <div
                      className={`${s.bar} h-3 rounded-full transition-all`}
                      style={{ width: `${(info.count / result.available_staff) * 100}%` }}
                    />
                  </div>
                  {/* Task badges */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {info.tasks.map(t => (
                      <span key={t.task} className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
                        {t.task}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary table */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 text-center text-sm">
            {Object.entries(result.allocation).map(([tier, info]) => (
              <div key={tier}>
                <p className="text-2xl font-bold text-gray-800">{info.count}</p>
                <p className="text-xs text-gray-500">{tier} staff</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page Shell ───────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const [days, setDays] = useState(7)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">AI Forecast</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Forecast:</span>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${days === d ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <ForecastChart days={days} />

      <div className="mt-6">
        <TaskAllocation />
      </div>
    </div>
  )
}
