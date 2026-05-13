import { useState, useEffect } from 'react'
import { useFetch } from '../hooks/useFetch'

const BASE = 'http://localhost:3001'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SKILL_COLORS = {
  'Sales Floor':   'bg-emerald-100 text-emerald-700',
  'Cashier':       'bg-indigo-100 text-indigo-700',
  'Fitting Room':  'bg-pink-100 text-pink-700',
  'Alteration':    'bg-purple-100 text-purple-700',
  'Runner':        'bg-amber-100 text-amber-700',
  'Self Check-Out':'bg-sky-100 text-sky-700',
  'Replenishment': 'bg-orange-100 text-orange-700',
}

const PRIORITY_STYLES = {
  1: { badge: 'bg-red-100 text-red-700',    label: 'P1' },
  2: { badge: 'bg-amber-100 text-amber-700', label: 'P2' },
  3: { badge: 'bg-green-100 text-green-700', label: 'P3' },
}

const STATUS_STYLES = {
  Active:          'bg-green-100 text-green-700',
  Completed:       'bg-gray-100 text-gray-500',
  Sick:            'bg-red-100 text-red-700',
  Swap_Requested:  'bg-amber-100 text-amber-700',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Employee List Tab ───────────────────────────────────────────────────────
function EmployeeList() {
  const [type, setType]   = useState('')
  const [skill, setSkill] = useState('')

  let query = '/api/employees?'
  if (type)  query += `type=${type}&`
  if (skill) query += `skill=${skill}`

  const { data, loading, error } = useFetch(query)

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Types</option>
          <option value="FT">Full-Time</option>
          <option value="PT">Part-Time</option>
        </select>
        <select value={skill} onChange={e => setSkill(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Skills</option>
          {Object.keys(SKILL_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error   && <p className="text-red-500">Error: {error}</p>}

      {!loading && data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Availability</th>
                <th className="px-5 py-3 text-left">Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{emp.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.type === 'FT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {emp.type === 'FT' ? 'Full-Time' : 'Part-Time'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {DAYS.map((day, i) => (
                        <span key={day} className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium ${emp.availability_mask[i] === '1' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {day[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.skills.filter(s => s.skill_name).map(s => (
                        <span key={s.skill_id} title={`Proficiency: ${s.proficiency_level}/5`} className={`px-2 py-0.5 rounded-full text-xs font-medium ${SKILL_COLORS[s.skill_name] || 'bg-gray-100 text-gray-600'}`}>
                          {s.skill_name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Daily Schedule Tab ──────────────────────────────────────────────────────
function DailySchedule() {
  const [date, setDate]     = useState(today())
  const [shifts, setShifts] = useState([])
  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [saving, setSaving] = useState(null) // shift id currently being saved

  // Fetch tasks once for the dropdown
  useEffect(() => {
    fetch(`${BASE}/api/tasks`)
      .then(r => r.json())
      .then(json => setTasks(json.data))
      .catch(() => {})
  }, [])

  // Fetch shifts whenever date changes
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${BASE}/api/shifts?date=${date}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(json => { setShifts(json.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [date])

  function handleTaskChange(shiftId, newTaskId) {
    // Optimistic update
    setShifts(prev => prev.map(s =>
      s.id === shiftId
        ? { ...s, task_id: Number(newTaskId), ...tasks.find(t => t.id === Number(newTaskId)) }
        : s
    ))
    setSaving(shiftId)
    fetch(`${BASE}/api/shifts/${shiftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_task_id: Number(newTaskId) }),
    })
      .then(r => r.json())
      .then(json => {
        setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, ...json.data } : s))
      })
      .catch(() => setError('Failed to save change'))
      .finally(() => setSaving(null))
  }

  function handleStatusChange(shiftId, newStatus) {
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: newStatus } : s))
    setSaving(shiftId)
    fetch(`${BASE}/api/shifts/${shiftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .catch(() => setError('Failed to save change'))
      .finally(() => setSaving(null))
  }

  const fmt = dt => new Date(dt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-500">{shifts.length} staff scheduled</span>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error   && <p className="text-red-500">Error: {error}</p>}

      {!loading && shifts.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          No shifts scheduled for this date.
        </div>
      )}

      {!loading && shifts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Hours</th>
                <th className="px-5 py-3 text-left">Assigned Task</th>
                <th className="px-5 py-3 text-left">Priority</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.map(shift => {
                const priority = PRIORITY_STYLES[shift.priority_level] || { badge: 'bg-gray-100 text-gray-500', label: '—' }
                const isSaving = saving === shift.id
                return (
                  <tr key={shift.id} className={`hover:bg-gray-50 ${isSaving ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{shift.employee_name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${shift.employee_type === 'FT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {shift.employee_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {fmt(shift.start_time)} – {fmt(shift.end_time)}
                    </td>

                    {/* Editable task dropdown */}
                    <td className="px-5 py-3">
                      <select
                        value={shift.task_id || ''}
                        onChange={e => handleTaskChange(shift.id, e.target.value)}
                        disabled={shift.status === 'Completed' || isSaving}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">— Unassigned —</option>
                        {tasks.map(t => (
                          <option key={t.id} value={t.id}>{t.task_name}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.badge}`}>
                        {priority.label}
                      </span>
                    </td>

                    {/* Editable status dropdown */}
                    <td className="px-5 py-3">
                      <select
                        value={shift.status}
                        onChange={e => handleStatusChange(shift.id, e.target.value)}
                        disabled={isSaving}
                        className={`border-0 rounded-full px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${STATUS_STYLES[shift.status] || 'bg-gray-100 text-gray-500'}`}
                      >
                        <option value="Active">Active</option>
                        <option value="Sick">Sick</option>
                        <option value="Swap_Requested">Swap Requested</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Page Shell ──────────────────────────────────────────────────────────────
export default function RosterPage() {
  const [tab, setTab] = useState('schedule')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Roster</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {[['schedule', 'Daily Schedule'], ['employees', 'Employees']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'schedule'  && <DailySchedule />}
      {tab === 'employees' && <EmployeeList />}
    </div>
  )
}
