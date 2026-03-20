import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff); d.setHours(0,0,0,0); return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function toISO(date) { return date.toISOString().split('T')[0] }

export default function Calendar() {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach'
  const [view, setView] = useState('month')
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [monthDate, setMonthDate] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [athletes, setAthletes] = useState([])
  const [routines, setRoutines] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState({ athlete_id: '', routine_id: '', notes: '' })

  useEffect(() => { fetchData() }, [selectedAthlete])

  async function fetchData() {
    const aid = isCoach ? (selectedAthlete || null) : user?.id
    let q = supabase.from('sessions').select('*, profiles(name), routines(name)')
    if (isCoach && aid) q = q.eq('athlete_id', aid)
    else if (isCoach) q = q.eq('coach_id', user.id)
    else q = q.eq('athlete_id', user.id)
    const { data: s } = await q
    setSessions(s || [])
    if (isCoach) {
      const [{ data: a }, { data: r }] = await Promise.all([
        supabase.from('profiles').select('id,name').eq('role','athlete'),
        supabase.from('routines').select('id,name').eq('coach_id', user.id)
      ])
      setAthletes(a || [])
      setRoutines(r || [])
      if (!form.athlete_id && a?.length) setForm(f => ({ ...f, athlete_id: a[0].id }))
      if (!form.routine_id && r?.length) setForm(f => ({ ...f, routine_id: r[0].id }))
    }
  }

  function sessionsByDate(dateStr) {
    return sessions.filter(s => s.date === dateStr)
  }

  function openModal(date) {
    if (!isCoach) return
    setSelectedDate(date)
    setShowModal(true)
  }

  async function saveSession() {
    if (!form.athlete_id || !form.routine_id || !selectedDate) return
    await supabase.from('sessions').insert({ coach_id: user.id, athlete_id: form.athlete_id, routine_id: form.routine_id, date: selectedDate, notes: form.notes, completed: false })
    setShowModal(false)
    setForm(f => ({ ...f, notes: '' }))
    fetchData()
  }

  const today = toISO(new Date())
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = (() => { const d = new Date(year,month,1).getDay(); return d===0?6:d-1 })()
  const totalCells = Math.ceil((firstDay+daysInMonth)/7)*7
  const weekDays = Array.from({length:7},(_,i) => addDays(weekStart,i))

  function DayDots({ dateStr }) {
    const ss = sessionsByDate(dateStr)
    if (!ss.length) return null
    return <div className="dot-row">{ss.map(s => <div key={s.id} className="dot" style={{ background: s.completed ? 'var(--green)' : 'var(--amber)' }} />)}</div>
  }

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <div className="tabs" style={{ marginBottom:0, flex:1, maxWidth:'200px' }}>
          <button className={`tab-btn ${view==='week'?'active':''}`} onClick={() => setView('week')}>Semana</button>
          <button className={`tab-btn ${view==='month'?'active':''}`} onClick={() => setView('month')}>Mes</button>
        </div>
        {isCoach && (
          <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)} style={{ width:'auto', marginBottom:0, fontSize:'12px' }}>
            <option value="">Todos</option>
            {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {view === 'month' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month-1,1))}>← Anterior</button>
            <span style={{ fontSize:'14px', fontWeight:700 }}>{MONTHS[month]} {year}</span>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month+1,1))}>Siguiente →</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
            {Array.from({length:totalCells},(_,i) => {
              const dayNum = i-firstDay+1
              const valid = dayNum>=1 && dayNum<=daysInMonth
              const dateStr = valid ? `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}` : null
              const isToday = dateStr===today
              return (
                <div key={i} className={`cal-day${!valid?' empty':''}${isToday?' today':''}`} onClick={() => dateStr && openModal(dateStr)}>
                  {valid && <>
                    <div style={{ textAlign:'center', fontSize:'12px', fontWeight: isToday?700:400, color: isToday?'var(--green)':'var(--text)' }}>{dayNum}</div>
                    <DayDots dateStr={dateStr} />
                  </>}
                </div>
              )
            })}
          </div>
          <div className="legend">
            <span><span className="legend-dot" style={{ background:'var(--green)' }} />Completada</span>
            <span><span className="legend-dot" style={{ background:'var(--amber)' }} />Pendiente</span>
          </div>
        </div>
      )}

      {view === 'week' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <button className="btn sm" onClick={() => setWeekStart(addDays(weekStart,-7))}>← Anterior</button>
            <span style={{ fontSize:'13px', fontWeight:700 }}>{weekDays[0].getDate()} {MONTHS[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {MONTHS[weekDays[6].getMonth()]}</span>
            <button className="btn sm" onClick={() => setWeekStart(addDays(weekStart,7))}>Siguiente →</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
            {weekDays.map(day => {
              const dateStr = toISO(day)
              const isToday = dateStr===today
              const ss = sessionsByDate(dateStr)
              return (
                <div key={dateStr} className={`cal-day${isToday?' today':''}`} onClick={() => openModal(dateStr)} style={{ minHeight:'90px' }}>
                  <div style={{ textAlign:'center', fontSize:'15px', fontWeight: isToday?700:400, color: isToday?'var(--green)':'var(--text)' }}>{day.getDate()}</div>
                  {ss.map(s => (
                    <div key={s.id} style={{ marginTop:'4px', fontSize:'10px', padding:'2px 4px', borderRadius:'4px', background: s.completed?'rgba(74,222,128,0.1)':'rgba(251,191,36,0.1)', color: s.completed?'var(--green)':'var(--amber)', lineHeight:1.3 }}>
                      {s.routines?.name}
                      {isCoach && s.profiles?.name && <div style={{ opacity:.7 }}>{s.profiles.name}</div>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="legend" style={{ marginTop:'14px' }}>
            <span><span className="legend-dot" style={{ background:'var(--green)' }} />Completada</span>
            <span><span className="legend-dot" style={{ background:'var(--amber)' }} />Pendiente</span>
          </div>
        </div>
      )}

      {showModal && isCoach && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Asignar sesión — {selectedDate}</h3>
            <div className="field"><label>Atleta</label>
              <select value={form.athlete_id} onChange={e => setForm({...form, athlete_id:e.target.value})}>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
            <div className="field"><label>Rutina</label>
              <select value={form.routine_id} onChange={e => setForm({...form, routine_id:e.target.value})}>
                {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></div>
            <div className="field"><label>Notas</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Indicaciones especiales..." /></div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveSession}>Asignar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
