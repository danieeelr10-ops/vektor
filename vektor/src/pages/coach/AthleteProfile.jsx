import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AthleteDashboard from './AthleteDashboard'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['L','M','M','J','V','S','D']

function toISO(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function AthleteProfile({ athlete, onBack, onUpdate }) {
  const { user } = useAuth()
  const [athleteData, setAthleteData] = useState({ ...athlete })
  const [tab, setTab] = useState(athlete.mode !== 'presencial' ? 'routines' : 'calendar')
  const [sessions, setSessions] = useState([])
  const [metrics, setMetrics] = useState([])
  const [rmRecords, setRmRecords] = useState([])
  const [routines, setRoutines] = useState([])
  const [allRoutines, setAllRoutines] = useState([])
  const [payments, setPayments] = useState([])
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAssign, setShowAssign] = useState(false)
  const [showDayDetail, setShowDayDetail] = useState(null)
  const [showPresencial, setShowPresencial] = useState(false)
  const [assignForm, setAssignForm] = useState({ routine_id: '', notes: '' })
  const [presencialForm, setPresencialForm] = useState({ note: '', completed: false })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: athlete.name, sport: athlete.sport, mode: athlete.mode || 'online' })
  const [editSaving, setEditSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ sessions_purchased: '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
  const [payLoading, setPayLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editPayForm, setEditPayForm] = useState({ sessions_purchased: '', sessions_used: '', amount: '', note: '', date: '' })
  const today = new Date().toISOString().split('T')[0]
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = (() => { const d = new Date(year,month,1).getDay(); return d===0?6:d-1 })()
  const totalCells = Math.ceil((firstDay+daysInMonth)/7)*7
  const isOnline = athleteData.mode !== 'presencial'

  const TABS = [
    ...(isOnline ? [{ id:'routines', label:'Rutinas' }] : []),
    { id:'calendar', label:'Calendario' },
    { id:'sesiones', label:'Sesiones' },
    { id:'metrics', label:'Métricas' },
    { id:'rm', label:'RM' },
    { id:'dashboard', label:'Dashboard' },
    { id:'pagos', label:'Pagos' },
  ]

  useEffect(() => { fetchAll() }, [athlete.id])

  async function fetchAll() {
    const [{ data: s }, { data: m }, { data: r }, { data: ro }, { data: allR }, { data: p }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name,exercises_data)').eq('athlete_id', athlete.id).order('date', { ascending: false }),
      supabase.from('metrics').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('rm_records').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('routines').select('id,name').eq('coach_id', user.id).order('name'),
      supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('athlete_id', athlete.id).order('date', { ascending: false })
    ])
    setSessions(s || [])
    setMetrics(m || [])
    setRmRecords(r || [])
    setRoutines(ro || [])
    setAllRoutines(allR || [])
    setPayments(p || [])
    if (ro?.length) setAssignForm(f => ({ ...f, routine_id: ro[0].id }))
  }

  // Payment info
  const lastPayment = payments[0]
  const sessionsRemaining = lastPayment ? (lastPayment.sessions_purchased - lastPayment.sessions_used) : 0

  function sessionsByDate(dateStr) {
    return sessions.filter(s => s.date === dateStr)
  }

  // Presencial: get note for date
  function presencialSessionForDate(dateStr) {
    return sessions.find(s => s.date === dateStr && s.notes !== undefined)
  }

  function openDay(dateStr) {
    setSelectedDate(dateStr)
    if (isOnline) {
      setAssignForm(f => ({ ...f, notes: '' }))
      setShowAssign(true)
    } else {
      const existing = presencialSessionForDate(dateStr)
      setPresencialForm({ note: existing?.notes || '', completed: existing?.completed || false })
      setShowPresencial(true)
    }
  }

  async function startEditPayment(p) {
    setEditingPayment(p)
    setEditPayForm({ sessions_purchased: p.sessions_purchased, sessions_used: p.sessions_used, amount: p.amount || '', note: p.note || '', date: p.date })
    setShowPayModal(true)
  }

  async function updatePayment() {
    if (!editingPayment) return
    setPayLoading(true)
    await supabase.from('payments').update({
      sessions_purchased: parseInt(editPayForm.sessions_purchased),
      sessions_used: parseInt(editPayForm.sessions_used) || 0,
      amount: editPayForm.amount ? parseFloat(editPayForm.amount) : null,
      note: editPayForm.note,
      date: editPayForm.date
    }).eq('id', editingPayment.id)
    setPayLoading(false)
    setShowPayModal(false)
    setEditingPayment(null)
    fetchAll()
  }

  async function deletePayment(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('payments').delete().eq('id', id)
    fetchAll()
  }

  async function savePayment() {
    if (!payForm.sessions_purchased) return
    setPayLoading(true)
    await supabase.from('payments').insert({
      athlete_id: athlete.id,
      sessions_purchased: parseInt(payForm.sessions_purchased),
      sessions_used: 0,
      amount: payForm.amount ? parseFloat(payForm.amount) : null,
      date: payForm.date,
      note: payForm.note
    })
    setPayLoading(false)
    setShowPayModal(false)
    setPayForm({ sessions_purchased: '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
    fetchAll()
  }

  async function assignSession() {
    if (!assignForm.routine_id || !selectedDate) return
    setSaving(true)
    await supabase.from('sessions').insert({
      coach_id: user.id, athlete_id: athlete.id,
      routine_id: assignForm.routine_id, date: selectedDate,
      notes: assignForm.notes, completed: false
    })
    setSaving(false); setShowAssign(false); fetchAll()
  }

  async function savePresencialDay() {
    if (!selectedDate) return
    setSaving(true)
    const existing = sessions.find(s => s.date === selectedDate)
    if (existing) {
      const wasCompleted = existing.completed
      await supabase.from('sessions').update({ notes: presencialForm.note, completed: presencialForm.completed }).eq('id', existing.id)
      // Auto-discount from package if newly completed
      if (!wasCompleted && presencialForm.completed && lastPayment && sessionsRemaining > 0) {
        await supabase.from('payments').update({ sessions_used: lastPayment.sessions_used + 1 }).eq('id', lastPayment.id)
      }
    } else {
      await supabase.from('sessions').insert({
        coach_id: user.id, athlete_id: athlete.id,
        routine_id: null, date: selectedDate,
        notes: presencialForm.note, completed: presencialForm.completed
      })
      if (presencialForm.completed && lastPayment && sessionsRemaining > 0) {
        await supabase.from('payments').update({ sessions_used: lastPayment.sessions_used + 1 }).eq('id', lastPayment.id)
      }
    }
    setSaving(false); setShowPresencial(false); fetchAll()
  }

  async function saveEdit() {
    setEditSaving(true)
    await supabase.from('profiles').update({ name: editForm.name, sport: editForm.sport, mode: editForm.mode }).eq('id', athlete.id)
    const updated = { ...athleteData, ...editForm }
    setAthleteData(updated)
    setEditSaving(false); setShowEdit(false)
    if (editForm.mode !== athleteData.mode) {
      setTab(editForm.mode !== 'presencial' ? 'routines' : 'calendar')
    }
    if (onUpdate) onUpdate(updated)
  }

  const rmGrouped = rmRecords.reduce((acc, r) => {
    if (!acc[r.exercise]) acc[r.exercise] = []
    acc[r.exercise].push(r)
    return acc
  }, {})

  const statStyle = { background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }
  const statLbl = { fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }
  const statVal = { fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#4ade80', fontFamily: 'monospace' }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <button className="btn sm" onClick={onBack}>← Volver</button>
        <button className="btn sm" onClick={() => setShowEdit(true)}>✏️ Editar</button>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4ade80', fontSize: '13px', flexShrink: 0 }}>
          {athleteData.name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#f0f0f0' }}>{athleteData.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>{athleteData.sport}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: !isOnline ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.15)', color: !isOnline ? '#a78bfa' : '#60a5fa' }}>
              {!isOnline ? 'Presencial' : 'Online'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: !isOnline ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {!isOnline && (
          <div style={statStyle}>
            <div style={statLbl}>Sesiones restantes</div>
            <div style={{ ...statVal, color: sessionsRemaining <= 2 ? '#f87171' : sessionsRemaining <= 4 ? '#fbbf24' : '#4ade80' }}>{sessionsRemaining}</div>
          </div>
        )}
        <div style={statStyle}><div style={statLbl}>Completadas</div><div style={statVal}>{sessions.filter(s=>s.completed).length}</div></div>
        <div style={statStyle}><div style={statLbl}>Mediciones</div><div style={statVal}>{metrics.length}</div></div>
      </div>

      {/* Presencial package bar */}
      {!isOnline && lastPayment && (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>Paquete actual</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: sessionsRemaining <= 2 ? '#f87171' : '#4ade80' }}>{sessionsRemaining} / {lastPayment.sessions_purchased} sesiones</span>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: lastPayment.sessions_purchased }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < (lastPayment.sessions_purchased - sessionsRemaining) ? 'rgba(255,255,255,0.08)' : sessionsRemaining <= 2 ? '#f87171' : '#4ade80', transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px', border: tab===t.id ? '1px solid rgba(74,222,128,0.3)' : 'none',
            background: tab===t.id ? '#222' : 'transparent',
            color: tab===t.id ? '#4ade80' : '#888',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', borderRadius: '8px', transition: 'all .15s', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ROUTINES TAB (online only) */}
      {tab === 'routines' && isOnline && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Rutinas disponibles</div>
          {allRoutines.length === 0 && <div className="empty">No hay rutinas creadas aún.</div>}
          {allRoutines.map(r => {
            const exData = (() => { try { return r.exercises_data ? JSON.parse(r.exercises_data) : null } catch { return null } })()
            return (
              <div key={r.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: exData?.length ? '8px' : 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{r.name}</span>
                  <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>{r.sport}</span>
                </div>
                {exData && exData.map((ex, ei) => (
                  <div key={ei} style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', marginBottom: '4px' }}>{ex.name}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ex.series?.map((s, si) => (
                        <span key={si} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#f0f0f0' }}>
                          S{si+1}: {s.reps||'?'} × <span style={{ color: '#4ade80', fontWeight: 700 }}>{s.weight||'?'}kg</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month-1,1))}>← Ant.</button>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{MONTHS[month]} {year}</span>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month+1,1))}>Sig. →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '4px' }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#555', paddingBottom: '4px' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDay + 1
              const valid = dayNum >= 1 && dayNum <= daysInMonth
              const dateStr = valid ? toISO(year, month, dayNum) : null
              const isToday = dateStr === today
              const ss = dateStr ? sessionsByDate(dateStr) : []
              const hasCompleted = ss.some(s => s.completed)
              const hasPending = ss.some(s => !s.completed)
              return (
                <div key={i} onClick={() => {
                    if (!valid) return
                    if (ss.length) setShowDayDetail({ date: dateStr, sessions: ss })
                    else { setSelectedDate(dateStr); isOnline ? setShowAssign(true) : setShowPresencial(true) }
                  }}
                  style={{
                    background: !valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.08)' : isToday ? 'rgba(74,222,128,0.04)' : '#111',
                    border: `1px solid ${!valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.35)' : hasPending ? 'rgba(251,191,36,0.25)' : isToday ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '8px', padding: '5px 3px', minHeight: '52px',
                    cursor: valid ? 'pointer' : 'default',
                    position: 'relative'
                  }}>
                  {valid && (
                    <>
                      <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                      {hasCompleted && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>✓</div>
                        </div>
                      )}
                      {!hasCompleted && hasPending && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fbbf24' }}>•••</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '10px', color: '#888', flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', marginRight: '4px' }}></span>Completada</span>
            {isOnline && <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', marginRight: '4px' }}></span>Pendiente</span>}
            {!isOnline && <span><span style={{ display: 'inline-block', width: '14px', height: '4px', borderRadius: '2px', background: '#a78bfa', marginRight: '4px', verticalAlign: 'middle' }}></span>Nota</span>}
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#555', textAlign: 'center' }}>Click en un día para asignar o ver sesiones</div>
        </div>
      )}

      {/* SESIONES TAB */}
      {tab === 'sesiones' && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            Sesiones completadas — {sessions.filter(s=>s.completed).length} total
          </div>
          {sessions.filter(s => s.completed).length === 0 && <div className="empty">Sin sesiones completadas aún.</div>}
          {sessions.filter(s => s.completed).map(s => {
            const exData = (() => { try { return s.routines?.exercises_data ? JSON.parse(s.routines.exercises_data) : null } catch { return null } })()
            const execData = (() => { try { return s.execution_data ? JSON.parse(s.execution_data) : null } catch { return null } })()
            return (
              <div key={s.id} style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#000', flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{s.routines?.name || 'Sesión'}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.date}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {s.rpe && <span style={{ background: '#1a1a1a', color: '#4ade80', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>RPE {s.rpe}</span>}
                    {s.duration && <span style={{ background: '#1a1a1a', color: '#aaa', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>{s.duration} min</span>}
                  </div>
                </div>

                {s.log_notes && (
                  <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', marginBottom: '10px', background: '#1a1a1a', padding: '8px 12px', borderRadius: '8px' }}>
                    "{s.log_notes}"
                  </div>
                )}

                {exData && exData.map((ex, exIdx) => {
                  if (!ex.series?.length) return null
                  return (
                    <div key={exIdx} style={{ marginBottom: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#f0f0f0', marginBottom: '6px' }}>{ex.name}</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                              <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Serie</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Plan</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Real</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Kg plan</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Kg real</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ex.series.map((serie, si) => {
                              const rKey = `${s.id}-${exIdx}-${si}-reps`
                              const wKey = `${s.id}-${exIdx}-${si}-weight`
                              const realReps = execData?.[rKey]
                              const realWeight = execData?.[wKey]
                              const exceeded = realWeight && serie.weight && parseFloat(realWeight) > parseFloat(serie.weight)
                              return (
                                <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '6px 8px', color: '#4ade80', fontWeight: 700 }}>S{si+1}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#555' }}>{serie.reps || '—'}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: realReps ? '#60a5fa' : '#333', fontWeight: 600 }}>{realReps || '—'}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#555' }}>{serie.weight ? `${serie.weight}kg` : '—'}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: exceeded ? '#4ade80' : realWeight ? '#60a5fa' : '#333', fontWeight: 600 }}>
                                    {realWeight ? `${realWeight}kg` : '—'}
                                    {exceeded && <span style={{ fontSize: '9px', marginLeft: '3px' }}>↑</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Pending sessions */}
          {sessions.filter(s => !s.completed).length > 0 && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 10px' }}>Sesiones pendientes</div>
              {sessions.filter(s => !s.completed).map(s => (
                <div key={s.id} style={{ background: '#111', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0f0f0' }}>{s.routines?.name || 'Sesión'}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.date}</div>
                    {s.notes && <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>"{s.notes}"</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>Pendiente</span>
                    <button className="btn danger sm" style={{ fontSize: '10px' }} onClick={async () => { if (!confirm('¿Eliminar?')) return; await supabase.from('sessions').delete().eq('id', s.id); fetchAll() }}>×</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* METRICS TAB */}
      {tab === 'metrics' && (
        <div>
          {metrics.length === 0 && <div className="empty">Sin medidas registradas.</div>}
          {metrics.map(m => (
            <div key={m.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>{m.date}</span>
                {m.goal && <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>{m.goal}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                {[['Peso',m.weight,'kg'],['Grasa',m.body_fat,'%'],['Músculo',m.muscle_pct,'%']].map(([l,v,u]) => v ? (
                  <div key={l} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80', marginTop: '3px', fontFamily: 'monospace' }}>{v}<span style={{ fontSize: '9px' }}>{u}</span></div>
                  </div>
                ) : null)}
              </div>
              {(m.arm_r || m.waist) && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[['Brazo der.',m.arm_r],['Brazo izq.',m.arm_l],['Pierna der.',m.leg_r],['Cintura',m.waist]].filter(c=>c[1]).map(c => (
                      <div key={c[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#aaa' }}>{c[0]}</span>
                        <span style={{ color: '#4ade80', fontWeight: 700 }}>{c[1]} cm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RM TAB */}
      {tab === 'rm' && (
        <div>
          {Object.keys(rmGrouped).length === 0 && <div className="empty">Sin registros de RM.</div>}
          {Object.entries(rmGrouped).map(([exercise, recs]) => {
            const best = recs.reduce((a, b) => parseFloat(a.weight) > parseFloat(b.weight) ? a : b)
            return (
              <div key={exercise} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{exercise}</span>
                  <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>Mejor: {best.weight}kg × {best.reps}</span>
                </div>
                {recs.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <span style={{ color: '#aaa', fontFamily: 'monospace' }}>{r.date}</span>
                    <span style={{ fontWeight: 700, color: r.id===best.id ? '#4ade80' : '#f0f0f0' }}>{r.weight}kg × {r.reps}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* PAGOS TAB */}
      {tab === 'pagos' && (
        <div>
          {/* Active package */}
          {lastPayment && (
            <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Paquete activo</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f0' }}>{lastPayment.sessions_purchased} sesiones{lastPayment.amount ? ` · $${lastPayment.amount.toLocaleString()}` : ''}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Desde {lastPayment.date}{lastPayment.note ? ` · ${lastPayment.note}` : ''}</div>
                </div>
                <span style={{ background: sessionsRemaining <= 2 ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)', color: sessionsRemaining <= 2 ? '#f87171' : '#4ade80', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{sessionsRemaining} restantes</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
                {Array.from({ length: lastPayment.sessions_purchased }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < lastPayment.sessions_used ? 'rgba(255,255,255,0.08)' : sessionsRemaining <= 2 ? '#f87171' : '#4ade80' }} />
                ))}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>{lastPayment.sessions_used} de {lastPayment.sessions_purchased} sesiones usadas</div>
            </div>
          )}

          {/* History header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' }}>Historial de pagos</div>
            <button className="btn primary sm" onClick={() => setShowPayModal(true)}>+ Pago</button>
          </div>

          {payments.length === 0 && <div className="empty">Sin pagos registrados aún.</div>}

          {payments.map((p, idx) => {
            const isActive = idx === 0
            const remaining = p.sessions_purchased - p.sessions_used
            return (
              <div key={p.id} style={{ background: '#111', border: `1px solid ${isActive ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f0' }}>{p.sessions_purchased} sesiones{p.amount ? ` · $${parseFloat(p.amount).toLocaleString()}` : ''}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{p.date}{p.note ? ` · ${p.note}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', color: isActive ? '#4ade80' : '#888', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>
                      {isActive ? 'Activo' : 'Completado'}
                    </span>
                    <button className="btn sm" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => startEditPayment(p)}>✏️</button>
                    <button className="btn danger sm" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => deletePayment(p.id)}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#555' }}>{p.sessions_used}/{p.sessions_purchased} sesiones usadas</div>
              </div>
            )
          })}

          {/* Totals */}
          {payments.length > 0 && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 14px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>Total recaudado</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>
                  ${payments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>Sesiones totales</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>
                  {payments.reduce((a, p) => a + (p.sessions_purchased || 0), 0)}
                </span>
              </div>
            </div>
          )}

          {/* Pay modal - create or edit */}
          {showPayModal && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && (setShowPayModal(false), setEditingPayment(null))}>
              <div className="modal">
                <h3>{editingPayment ? 'Editar pago' : `Registrar pago — ${athleteData.name}`}</h3>
                <div className="field"><label>Fecha del pago</label>
                  <input type="date" value={editingPayment ? editPayForm.date : payForm.date} onChange={e => editingPayment ? setEditPayForm({...editPayForm, date: e.target.value}) : setPayForm({...payForm, date: e.target.value})} />
                </div>
                <div className="field"><label>Sesiones compradas</label>
                  <input type="number" value={editingPayment ? editPayForm.sessions_purchased : payForm.sessions_purchased} onChange={e => editingPayment ? setEditPayForm({...editPayForm, sessions_purchased: e.target.value}) : setPayForm({...payForm, sessions_purchased: e.target.value})} placeholder="8" />
                </div>
                {editingPayment && (
                  <div className="field"><label>Sesiones usadas</label>
                    <input type="number" value={editPayForm.sessions_used} onChange={e => setEditPayForm({...editPayForm, sessions_used: e.target.value})} placeholder="0" />
                  </div>
                )}
                <div className="field"><label>Monto recibido</label>
                  <input type="number" value={editingPayment ? editPayForm.amount : payForm.amount} onChange={e => editingPayment ? setEditPayForm({...editPayForm, amount: e.target.value}) : setPayForm({...payForm, amount: e.target.value})} placeholder="150000" />
                </div>
                <div className="field"><label>Método / nota</label>
                  <input value={editingPayment ? editPayForm.note : payForm.note} onChange={e => editingPayment ? setEditPayForm({...editPayForm, note: e.target.value}) : setPayForm({...payForm, note: e.target.value})} placeholder="Transferencia, efectivo, Nequi..." />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => { setShowPayModal(false); setEditingPayment(null) }}>Cancelar</button>
                  <button className="btn primary" onClick={editingPayment ? updatePayment : savePayment} disabled={payLoading}>{payLoading ? 'Guardando...' : editingPayment ? 'Guardar cambios' : 'Registrar pago'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (
        <AthleteDashboard athlete={athleteData} onBack={() => setTab('metrics')} />
      )}

      {/* DAY DETAIL MODAL */}
      {showDayDetail && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowDayDetail(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}>{showDayDetail.date}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn primary sm" onClick={() => { setSelectedDate(showDayDetail.date); setShowDayDetail(null); isOnline ? setShowAssign(true) : setShowPresencial(true) }}>+ Sesión</button>
                <button className="btn sm" onClick={() => setShowDayDetail(null)}>✕</button>
              </div>
            </div>
            {showDayDetail.sessions.map(s => {
              const exData = (() => { try { return s.routines?.exercises_data ? JSON.parse(s.routines.exercises_data) : null } catch { return null } })()
              const execData = (() => { try { return s.execution_data ? JSON.parse(s.execution_data) : null } catch { return null } })()
              return (
                <div key={s.id} style={{ background: s.completed ? 'rgba(74,222,128,0.06)' : '#1a1a1a', border: `1px solid ${s.completed ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s.completed
                        ? <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>✓</div>
                        : <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: '2px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
                      }
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{s.routines?.name || 'Sesión'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {s.rpe && <span style={{ background: '#111', color: '#4ade80', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>RPE {s.rpe}</span>}
                      {s.duration && <span style={{ background: '#111', color: '#aaa', padding: '2px 7px', borderRadius: '6px', fontSize: '10px' }}>{s.duration} min</span>}
                    </div>
                  </div>
                  {s.log_notes && <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', background: '#111', padding: '7px 10px', borderRadius: '7px', marginBottom: '10px' }}>"{s.log_notes}"</div>}
                  {s.notes && !s.completed && <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>📋 {s.notes}</div>}
                  {exData && s.completed && exData.map((ex, exIdx) => {
                    if (!ex.series?.length) return null
                    return (
                      <div key={exIdx} style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0f0f0', marginBottom: '5px' }}>{ex.name}</div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111', borderRadius: '8px', overflow: 'hidden', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                <th style={{ padding: '5px 7px', textAlign: 'left', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>S</th>
                                <th style={{ padding: '5px 7px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Plan</th>
                                <th style={{ padding: '5px 7px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Real</th>
                                <th style={{ padding: '5px 7px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Kg plan</th>
                                <th style={{ padding: '5px 7px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Kg real</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ex.series.map((serie, si) => {
                                const realReps = execData?.[`${s.id}-${exIdx}-${si}-reps`]
                                const realWeight = execData?.[`${s.id}-${exIdx}-${si}-weight`]
                                const exceeded = realWeight && serie.weight && parseFloat(realWeight) > parseFloat(serie.weight)
                                return (
                                  <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '5px 7px', color: '#4ade80', fontWeight: 700 }}>S{si+1}</td>
                                    <td style={{ padding: '5px 7px', textAlign: 'center', color: '#555' }}>{serie.reps||'—'}</td>
                                    <td style={{ padding: '5px 7px', textAlign: 'center', color: realReps ? '#60a5fa' : '#333', fontWeight: 600 }}>{realReps||'—'}</td>
                                    <td style={{ padding: '5px 7px', textAlign: 'center', color: '#555' }}>{serie.weight ? `${serie.weight}kg` : '—'}</td>
                                    <td style={{ padding: '5px 7px', textAlign: 'center', color: exceeded ? '#4ade80' : realWeight ? '#60a5fa' : '#333', fontWeight: 600 }}>
                                      {realWeight ? `${realWeight}kg` : '—'}{exceeded && <span style={{ fontSize: '9px', marginLeft: '2px' }}>↑</span>}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                  {exData && !s.completed && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {exData.map((ex, ei) => (
                        <span key={ei} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#aaa' }}>{ex.name}</span>
                      ))}
                    </div>
                  )}
                  {!s.completed && (
                    <button className="btn danger sm" style={{ marginTop: '8px', fontSize: '10px' }} onClick={async () => { if(!confirm('¿Eliminar?')) return; await supabase.from('sessions').delete().eq('id', s.id); setShowDayDetail(null); fetchAll() }}>Eliminar sesión</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ONLINE: Assign session modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAssign(false)}>
          <div className="modal">
            <h3>Asignar sesión — {selectedDate}</h3>
            <div className="field"><label>Rutina</label>
              <select value={assignForm.routine_id} onChange={e => setAssignForm({...assignForm, routine_id: e.target.value})}>
                {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Fecha</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="field"><label>Notas para el atleta</label>
              <textarea rows={2} value={assignForm.notes} onChange={e => setAssignForm({...assignForm, notes: e.target.value})} placeholder="Indicaciones especiales..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowAssign(false)}>Cancelar</button>
              <button className="btn primary" onClick={assignSession} disabled={saving}>{saving ? 'Guardando...' : 'Asignar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PRESENCIAL: Day note + session check modal */}
      {showPresencial && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowPresencial(false)}>
          <div className="modal">
            <h3>Sesión presencial — {selectedDate}</h3>
            <div className="field">
              <label>Notas de la sesión</label>
              <textarea rows={4} value={presencialForm.note} onChange={e => setPresencialForm({...presencialForm, note: e.target.value})} placeholder="Ejercicios realizados, observaciones, rendimiento del atleta..." />
            </div>
            <div
              onClick={() => setPresencialForm(f => ({ ...f, completed: !f.completed }))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: presencialForm.completed ? 'rgba(74,222,128,0.08)' : '#1a1a1a', border: `1px solid ${presencialForm.completed ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', cursor: 'pointer', marginBottom: '14px' }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: presencialForm.completed ? '#4ade80' : 'transparent', border: `2px solid ${presencialForm.completed ? '#4ade80' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {presencialForm.completed && <span style={{ color: '#000', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f0f0f0' }}>Sesión realizada</div>
                {lastPayment && sessionsRemaining > 0 && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {presencialForm.completed ? `Descuenta 1 sesión del paquete (quedan ${sessionsRemaining - 1})` : `Quedan ${sessionsRemaining} sesiones en el paquete`}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowPresencial(false)}>Cancelar</button>
              <button className="btn primary" onClick={savePresencialDay} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowEdit(false)}>
          <div className="modal">
            <h3>Editar atleta</h3>
            <div className="field"><label>Nombre</label>
              <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div className="field"><label>Deporte</label>
              <select value={editForm.sport} onChange={e => setEditForm({...editForm, sport: e.target.value})}>
                {['Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Gym','Otro'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Modo</label>
              <select value={editForm.mode} onChange={e => setEditForm({...editForm, mode: e.target.value})}>
                <option value="online">🌐 Online / A distancia</option>
                <option value="presencial">🏋️ Presencial</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowEdit(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
