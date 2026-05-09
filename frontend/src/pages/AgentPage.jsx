import { useState, useEffect } from 'react'

const BASE = 'http://localhost:3001'

const PRIORITY_BADGE = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-green-100 text-green-700',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Sick Leave Panel ─────────────────────────────────────────────────────────
function SickLeavePanel() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate]             = useState(today())
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  useEffect(() => {
    fetch(`${BASE}/api/employees`)
      .then(r => r.json())
      .then(j => { setEmployees(j.data); if (j.data.length) setEmployeeId(j.data[0].id) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch(`${BASE}/api/agent/sick-leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: Number(employeeId), date }),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error)
      setResult(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">🤒</span>
        <div>
          <h3 className="font-semibold text-gray-800">Sick Leave — Auto Reschedule</h3>
          <p className="text-xs text-gray-500 mt-0.5">Report an absence and the agent will automatically reallocate staff</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-5">
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        >
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} ({emp.type})</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Processing...' : 'Report Sick Leave'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Affected shift */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Absent Employee</p>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">{result.sick_employee}</span>
              <span className="text-gray-400">·</span>
              <span className="text-sm text-gray-600">{result.affected_task}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[result.priority_level]}`}>
                P{result.priority_level}
              </span>
            </div>
          </div>

          {/* Agent action */}
          <div className={`rounded-lg p-4 border ${result.reassignment ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-xs uppercase tracking-wide mb-1 font-medium ${result.reassignment ? 'text-emerald-600' : 'text-amber-600'}`}>
              {result.reassignment ? '✅ Agent Action — Internal Reallocation' : '⚠️ Agent Action'}
            </p>
            <p className="text-sm text-gray-700">{result.action}</p>
          </div>

          {/* Reassignment detail */}
          {result.reassignment && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Reassignment Detail</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-gray-800">{result.reassignment.employee_name}</p>
                  <p className="text-xs text-gray-400">Reallocated employee</p>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium line-through opacity-60">
                    {result.reassignment.from_task}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
                    {result.reassignment.to_task}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-indigo-600">{result.reassignment.proficiency_level}/5</p>
                  <p className="text-xs text-gray-400">Proficiency</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shift Swap Panel ─────────────────────────────────────────────────────────
function ShiftSwapPanel() {
  const [shiftId, setShiftId]   = useState('')
  const [shifts, setShifts]     = useState([])
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    fetch(`${BASE}/api/shifts?date=${today()}`)
      .then(r => r.json())
      .then(j => {
        const active = j.data.filter(s => s.status === 'Active')
        setShifts(active)
        if (active.length) setShiftId(active[0].id)
      })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch(`${BASE}/api/agent/shift-swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: Number(shiftId) }),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error)
      setResult(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = dt => new Date(dt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">🔄</span>
        <div>
          <h3 className="font-semibold text-gray-800">Shift Swap Marketplace</h3>
          <p className="text-xs text-gray-500 mt-0.5">Find eligible peers to swap shifts with — no manager needed</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-5">
        <select
          value={shiftId}
          onChange={e => setShiftId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
        >
          {shifts.length === 0 && <option>No active shifts today</option>}
          {shifts.map(s => (
            <option key={s.id} value={s.id}>
              {s.employee_name} — {s.task_name} ({fmt(s.start_time)}–{fmt(s.end_time)})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || shifts.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Find Swap Peers'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm">
            <p className="text-indigo-700 font-medium mb-1">Swap request raised for {result.employee_name}</p>
            <p className="text-indigo-600 text-xs">
              Task: {result.task} · Skill required: {result.required_skill || 'None'} · {result.peer_count} eligible peer{result.peer_count !== 1 ? 's' : ''} found
            </p>
          </div>

          {result.eligible_peers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No eligible peers available for this shift.</p>
          ) : (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Eligible Peers</p>
              <div className="space-y-2">
                {result.eligible_peers.map((peer, i) => (
                  <div key={peer.employee_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{peer.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${peer.type === 'FT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {peer.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Proficiency</span>
                      <span className="font-semibold text-indigo-600 text-sm">{peer.proficiency_level}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page Shell ───────────────────────────────────────────────────────────────
export default function AgentPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">AI Reschedule Agent</h2>
        <p className="text-sm text-gray-500 mt-1">
          Autonomous absence management — internal reallocation first, escalation only as a last resort
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { step: '1', icon: '🔍', title: 'Gap Assessment', desc: 'Identifies the missing staff\'s task and its P1/P2/P3 priority level' },
          { step: '2', icon: '🤖', title: 'Smart Reallocation', desc: 'Scans on-site P3 (Flexible) staff with matching skills to cover the gap' },
          { step: '3', icon: '📣', title: 'Escalation', desc: 'Triggers Shift Swap Marketplace only if internal reallocation fails' },
        ].map(card => (
          <div key={card.step} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Step {card.step}</p>
            <p className="font-semibold text-gray-800 text-sm mb-1">{card.title}</p>
            <p className="text-xs text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <SickLeavePanel />
        <ShiftSwapPanel />
      </div>
    </div>
  )
}
