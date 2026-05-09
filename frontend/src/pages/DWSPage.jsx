import { useState, useEffect } from 'react'

const BASE = 'http://localhost:3001'

const TASK_COLORS = {
  SF_A: { bg: 'bg-blue-500',    text: 'text-white', light: 'bg-blue-100 text-blue-800' },
  SF_B: { bg: 'bg-blue-400',    text: 'text-white', light: 'bg-blue-100 text-blue-700' },
  SF_C: { bg: 'bg-indigo-500',  text: 'text-white', light: 'bg-indigo-100 text-indigo-800' },
  SF_D: { bg: 'bg-indigo-400',  text: 'text-white', light: 'bg-indigo-100 text-indigo-700' },
  CSH:  { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100 text-emerald-800' },
  SCO:  { bg: 'bg-emerald-400', text: 'text-white', light: 'bg-emerald-100 text-emerald-700' },
  FR1:  { bg: 'bg-pink-500',    text: 'text-white', light: 'bg-pink-100 text-pink-800' },
  FR2:  { bg: 'bg-pink-400',    text: 'text-white', light: 'bg-pink-100 text-pink-700' },
  FR3:  { bg: 'bg-pink-300',    text: 'text-white', light: 'bg-pink-100 text-pink-600' },
  RN:   { bg: 'bg-amber-500',   text: 'text-white', light: 'bg-amber-100 text-amber-800' },
  RP:   { bg: 'bg-orange-500',  text: 'text-white', light: 'bg-orange-100 text-orange-800' },
  ALT:  { bg: 'bg-purple-500',  text: 'text-white', light: 'bg-purple-100 text-purple-800' },
}

const PRIORITY_LABEL = { 1: 'P1 Critical', 2: 'P2 Supporting', 3: 'P3 Flexible' }
const PRIORITY_COLOR = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-green-100 text-green-700',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ─── Gantt Bar ────────────────────────────────────────────────────────────────
function GanttBar({ slot, dayStart, dayEnd }) {
  const total    = dayEnd - dayStart
  const left     = ((timeToMin(slot.start) - dayStart) / total) * 100
  const width    = ((timeToMin(slot.end) - timeToMin(slot.start)) / total) * 100
  const isBreak  = slot.type === 'break'
  const colors   = isBreak ? null : TASK_COLORS[slot.task_code]

  return (
    <div
      className={`absolute top-1 bottom-1 rounded flex items-center justify-center text-xs font-medium overflow-hidden
        ${isBreak
          ? 'bg-gray-200 text-gray-500 border border-gray-300'
          : `${colors?.bg || 'bg-gray-400'} ${colors?.text || 'text-white'}`
        }`}
      style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
      title={isBreak ? `Break (${slot.break_type})` : `${slot.task_code} — ${slot.start}–${slot.end}`}
    >
      {width > 6 && (isBreak ? '☕' : slot.task_code)}
    </div>
  )
}

// ─── Coverage Table ───────────────────────────────────────────────────────────
function CoverageTable({ coverage }) {
  if (!coverage) return null
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Staffing Coverage</h3>
      <div className="grid grid-cols-2 gap-2">
        {coverage.map(c => (
          <div key={c.task_code} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${TASK_COLORS[c.task_code]?.bg || 'bg-gray-400'}`} />
              <span className="font-medium text-gray-700">{c.task_code}</span>
              <span className="text-gray-500">{c.task_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[c.priority]}`}>
                P{c.priority}
              </span>
              <span className={`font-semibold ${
                c.status === 'OK'          ? 'text-emerald-600' :
                c.status === 'OPTIONAL'    ? 'text-gray-400'    :
                                             'text-red-600'
              }`}>
                {c.assigned}/{c.min_required}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DWSPage() {
  const [date, setDate]       = useState(today())
  const [dws, setDws]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError]     = useState(null)

  // Load existing DWS for the selected date
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${BASE}/api/dws?date=${date}`)
      .then(r => r.json())
      .then(json => { setDws(json.generated ? json : null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [date])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const r = await fetch(`${BASE}/api/dws/generate?date=${date}`, { method: 'POST' })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || json.detail)
      setDws(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // Determine Gantt axis range
  const dayStart = dws ? Math.min(...dws.schedules.map(s => timeToMin(s.schedule[0]?.start || '09:00'))) : 9 * 60
  const dayEnd   = dws ? Math.max(...dws.schedules.map(s => timeToMin(s.schedule.at(-1)?.end || '18:00'))) : 18 * 60
  const hourTicks = []
  for (let m = dayStart; m <= dayEnd; m += 60) {
    hourTicks.push({ min: m, label: `${String(Math.floor(m / 60)).padStart(2, '0')}:00` })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Daily Work Schedule</h2>
          <p className="text-sm text-gray-500 mt-0.5">Auto-generated timetable with task rotation and break compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? '⏳ Generating...' : '⚡ Generate DWS'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!loading && !dws && !error && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No DWS generated for this date yet</p>
          <p className="text-gray-400 text-sm mb-4">Click <strong>Generate DWS</strong> to auto-schedule all staff</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg disabled:opacity-50"
          >
            {generating ? 'Generating...' : '⚡ Generate DWS'}
          </button>
        </div>
      )}

      {dws && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-lg font-bold text-gray-800">{dws.day}</p>
              <p className="text-xs text-gray-400">{dws.date}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Store Hours</p>
              <p className="text-lg font-bold text-indigo-600">{dws.store_hours?.open} – {dws.store_hours?.close}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Staff Scheduled</p>
              <p className="text-lg font-bold text-emerald-600">{dws.staff_count ?? dws.schedules?.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Understaffed Tasks</p>
              <p className={`text-lg font-bold ${
                (dws.coverage?.filter(c => c.status === 'UNDERSTAFFED').length || 0) > 0
                  ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {dws.coverage?.filter(c => c.status === 'UNDERSTAFFED').length ?? '—'}
              </p>
            </div>
          </div>

          {/* Gantt chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Timetable</h3>

            {/* Hour axis */}
            <div className="flex mb-1 ml-36">
              <div className="relative flex-1">
                {hourTicks.map(tick => (
                  <span
                    key={tick.min}
                    className="absolute text-xs text-gray-400 -translate-x-1/2"
                    style={{ left: `${((tick.min - dayStart) / (dayEnd - dayStart)) * 100}%` }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Employee rows */}
            <div className="space-y-1 mt-4">
              {(dws.schedules || []).map(sched => (
                <div key={sched.employee_id} className="flex items-center gap-2">
                  {/* Name */}
                  <div className="w-36 shrink-0 text-right pr-2">
                    <p className="text-xs font-medium text-gray-700 truncate">{sched.employee_name}</p>
                    <span className={`text-xs px-1 rounded ${sched.employee_type === 'FT' ? 'text-green-600' : 'text-gray-400'}`}>
                      {sched.employee_type}
                    </span>
                  </div>
                  {/* Gantt row */}
                  <div className="relative flex-1 h-9 bg-gray-50 rounded border border-gray-100">
                    {(sched.schedule || []).map((slot, i) => (
                      <GanttBar key={i} slot={slot} dayStart={dayStart} dayEnd={dayEnd} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {Object.entries(TASK_COLORS).map(([code, c]) => (
                <span key={code} className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.light}`}>
                  {code}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">☕ Break</span>
            </div>
          </div>

          {/* Coverage table */}
          {dws.coverage && <CoverageTable coverage={dws.coverage} />}
        </div>
      )}
    </div>
  )
}
