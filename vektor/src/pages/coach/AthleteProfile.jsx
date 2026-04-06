import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AthleteDashboard from './AthleteDashboard'
import Routines from './Routines'
import MetricsChart from '../../components/MetricsChart'
import ProgressShareCard from '../../components/ProgressShareCard'

const TIME_OPTIONS = ['', ...Array.from({length: 34}, (_, i) => {
  const totalMins = 5 * 60 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const ampm = h < 12 ? 'am' : 'pm'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { value: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, label: `${h12}:${String(m).padStart(2,'0')} ${ampm}` }
})]

function TimeSelect({ value, onChange, placeholder = 'Hora' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">{placeholder}</option>
      {TIME_OPTIONS.filter(t => t).map(t => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  )
}

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
  const [assignForm, setAssignForm] = useState({ routine_id: '', notes: '', start_time: '', end_time: '' })
  const [presencialForm, setPresencialForm] = useState({ note: '', completed: false, start_time: '', end_time: '' })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: athlete.name, sport: athlete.sport, mode: athlete.mode || 'online' })
  const [editSaving, setEditSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState(new Set())
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ sessions_purchased: '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
  const [payLoading, setPayLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editPayForm, setEditPayForm] = useState({ sessions_purchased: '', sessions_used: '', amount: '', note: '', date: '' })
  const [cycles, setCycles] = useState([])
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [cycleForm, setCycleForm] = useState({ label: 'Ciclo 1', start_date: '', end_date: '' })
  const [events, setEvents] = useState([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({ label: '', notes: '' })
  const [showMetricForm, setShowMetricForm] = useState(false)
  const [mForm, setMForm] = useState({ date: new Date().toISOString().split('T')[0], weight: '', muscle_kg: '', body_fat: '', fat_kg: '', protein_kg: '', bones_kg: '', water_l: '', lean_mass_kg: '', imc: '', arm_r: '', arm_l: '', leg_r: '', leg_l: '', waist: '', note: '' })
  const [mSaving, setMSaving] = useState(false)
  const [mScanning, setMScanning] = useState(false)
  const [sessionEditor, setSessionEditor] = useState(null) // { session, items, execData }
  const [sessionEditorSaving, setSessionEditorSaving] = useState(false)
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
    const [{ data: s }, { data: m }, { data: r }, { data: ro }, { data: allR }, { data: p }, { data: cy }, { data: ev }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name,exercises_data)').eq('athlete_id', athlete.id).order('date', { ascending: false }),
      supabase.from('metrics').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('rm_records').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('routines').select('id,name').eq('coach_id', user.id).eq('athlete_id', athlete.id).order('name'),
      supabase.from('routines').select('*').eq('coach_id', user.id).eq('athlete_id', athlete.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('athlete_id', athlete.id).order('date', { ascending: false }),
      supabase.from('cycles').select('*').eq('athlete_id', athlete.id).order('start_date', { ascending: false }),
      supabase.from('calendar_events').select('*').eq('athlete_id', athlete.id).order('date')
    ])
    setSessions(s || [])
    setMetrics(m || [])
    setRmRecords(r || [])
    setRoutines(ro || [])
    setAllRoutines(allR || [])
    setPayments(p || [])
    setCycles(cy || [])
    setEvents(ev || [])
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
    if (!assignForm.routine_id) { alert('Selecciona una rutina'); return }
    if (!selectedDate) return
    setSaving(true)
    const scheduledTime = (assignForm.start_time && assignForm.end_time) ? `${assignForm.start_time} - ${assignForm.end_time}` : assignForm.start_time || null
    const routine = routines.find(r => r.id === assignForm.routine_id)
    const { error: insertError } = await supabase.from('sessions').insert({
      coach_id: user.id, athlete_id: athlete.id,
      routine_id: assignForm.routine_id, date: selectedDate,
      notes: assignForm.notes, completed: false,
      scheduled_time: scheduledTime
    })
    if (insertError) { alert('Error al asignar sesión: ' + insertError.message); setSaving(false); return }
    // Notificaciones (fire-and-forget)
    if (athleteData.email) {
      supabase.functions.invoke('notify-session', {
        body: {
          athlete_email: athleteData.email,
          athlete_name: athleteData.name,
          date: selectedDate,
          scheduled_time: scheduledTime,
          routine_name: routine?.name || null,
          notes: assignForm.notes || null
        }
      })
    }
    supabase.functions.invoke('notify-push', {
      body: {
        user_id: athlete.id,
        title: 'Nueva sesión asignada',
        body: `${routine?.name || 'Sesión'} · ${selectedDate}${scheduledTime ? ` · ${scheduledTime}` : ''}`,
        url: '/',
      }
    })
    setSaving(false); setShowAssign(false); fetchAll()
  }

  async function savePresencialDay() {
    if (!selectedDate) return
    setSaving(true)
    const existing = sessions.find(s => s.date === selectedDate)
    if (existing) {
      const wasCompleted = existing.completed
      const scheduledTime = (presencialForm.start_time && presencialForm.end_time) ? `${presencialForm.start_time} - ${presencialForm.end_time}` : presencialForm.start_time || null
      await supabase.from('sessions').update({ notes: presencialForm.note, completed: presencialForm.completed, scheduled_time: scheduledTime }).eq('id', existing.id)
      // Auto-discount from package if newly completed
      if (!wasCompleted && presencialForm.completed && lastPayment && sessionsRemaining > 0) {
        await supabase.from('payments').update({ sessions_used: lastPayment.sessions_used + 1 }).eq('id', lastPayment.id)
      }
    } else {
      await supabase.from('sessions').insert({
        coach_id: user.id, athlete_id: athlete.id,
        routine_id: null, date: selectedDate,
        notes: presencialForm.note, completed: presencialForm.completed,
        scheduled_time: (presencialForm.start_time && presencialForm.end_time) ? `${presencialForm.start_time} - ${presencialForm.end_time}` : presencialForm.start_time || null
      })
      if (presencialForm.completed && lastPayment && sessionsRemaining > 0) {
        await supabase.from('payments').update({ sessions_used: lastPayment.sessions_used + 1 }).eq('id', lastPayment.id)
      }
    }
    setSaving(false); setShowPresencial(false); fetchAll()
  }

  async function saveCycle() {
    if (!cycleForm.start_date || !cycleForm.end_date) return
    await supabase.from('cycles').insert({ coach_id: user.id, athlete_id: athlete.id, label: cycleForm.label || 'Ciclo', start_date: cycleForm.start_date, end_date: cycleForm.end_date })
    setShowCycleModal(false)
    setCycleForm({ label: 'Ciclo 1', start_date: '', end_date: '' })
    fetchAll()
  }

  async function deleteCycle(id) {
    if (!confirm('¿Eliminar este ciclo?')) return
    await supabase.from('cycles').delete().eq('id', id)
    fetchAll()
  }

  function dateInCycle(dateStr) {
    return cycles.find(c => dateStr >= c.start_date && dateStr <= c.end_date)
  }

  function eventsForDate(dateStr) {
    return events.filter(e => e.date === dateStr)
  }

  async function saveEvent() {
    if (!eventForm.label.trim() || !selectedDate) return
    await supabase.from('calendar_events').insert({
      athlete_id: athlete.id,
      coach_id: user.id,
      date: selectedDate,
      label: eventForm.label.trim(),
      notes: eventForm.notes.trim() || null
    })
    setShowEventModal(false)
    setEventForm({ label: '', notes: '' })
    fetchAll()
  }

  async function deleteEvent(id) {
    await supabase.from('calendar_events').delete().eq('id', id)
    fetchAll()
  }

  const COMP_FIELDS = [
    ['weight',       'Peso (kg)'],
    ['water_l',      'Agua corporal (L)'],
    ['fat_kg',       'Masa grasa corporal (kg)'],
    ['lean_mass_kg', 'Masa corporal magra (kg)'],
    ['fat_free_kg',  'Masa libre de grasa (kg)'],
    ['muscle_kg',    'MME — Masa muscular esquelética (kg)'],
    ['imc',          'IMC (kg/m²)'],
    ['body_fat',     'PGC — % Grasa corporal'],
  ]
  const CIRC_FIELDS = [
    ['arm_r','Brazo der. (cm)'],
    ['arm_l','Brazo izq. (cm)'],
    ['leg_r','Pierna der. (cm)'],
    ['leg_l','Pierna izq. (cm)'],
    ['waist','Cintura (cm)'],
  ]

  async function scanMetrics(file) {
    setMScanning(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const { data, error } = await supabase.functions.invoke('scan-metrics', {
        body: { image_base64: base64, mime_type: file.type || 'image/jpeg' }
      })
      if (error) throw new Error(error.message)
      if (!data.ok) throw new Error(data.error)
      const m = data.metrics
      setMForm(f => ({
        ...f,
        ...(m.weight     != null ? { weight:      String(m.weight)     } : {}),
        ...(m.imc        != null ? { imc:         String(m.imc)        } : {}),
        ...(m.body_fat   != null ? { body_fat:    String(m.body_fat)   } : {}),
        ...(m.fat_kg     != null ? { fat_kg:      String(m.fat_kg)     } : {}),
        ...(m.muscle_kg  != null ? { muscle_kg:   String(m.muscle_kg)  } : {}),
        ...(m.protein_kg != null ? { protein_kg:  String(m.protein_kg) } : {}),
        ...(m.bones_kg   != null ? { bones_kg:    String(m.bones_kg)   } : {}),
        ...(m.water_l    != null ? { water_l:     String(m.water_l)    } : {}),
        ...(m.lean_mass_kg  != null ? { lean_mass_kg:  String(m.lean_mass_kg)  } : {}),
        ...(m.fat_free_kg  != null ? { fat_free_kg:   String(m.fat_free_kg)   } : {}),
      }))
    } catch (e) {
      alert('Error al escanear: ' + e.message)
    }
    setMScanning(false)
  }

  async function saveMetric() {
    setMSaving(true)
    const payload = { user_id: athlete.id, date: mForm.date, note: mForm.note || null }
    ;[...COMP_FIELDS, ...CIRC_FIELDS].forEach(([k]) => { if (mForm[k] !== '') payload[k] = parseFloat(mForm[k]) })
    const { data: inserted } = await supabase.from('metrics').insert(payload).select('id').single()
    // Generar análisis IA en background
    if (inserted?.id) {
      supabase.functions.invoke('analyze-metrics', { body: { metric_id: inserted.id, user_id: athlete.id } })
        .then(() => fetchAll())
    }
    setMSaving(false)
    setShowMetricForm(false)
    setMForm({ date: today, weight: '', water_l: '', protein_kg: '', bones_kg: '', fat_kg: '', lean_mass_kg: '', fat_free_kg: '', muscle_kg: '', imc: '', body_fat: '', arm_r: '', arm_l: '', leg_r: '', leg_l: '', waist: '', note: '' })
    fetchAll()
  }

  function openSessionEditor(s) {
    const exData = (() => { try { const r = s.routines?.exercises_data; return r ? (typeof r === 'string' ? JSON.parse(r) : r) : [] } catch { return [] } })()
    const execData = (() => { try { return s.execution_data ? JSON.parse(s.execution_data) : {} } catch { return {} } })()
    // Build items: cada ejercicio con sus series y los valores reales del atleta
    const items = exData.map((ex, exIdx) => ({
      ...ex,
      series: (ex.series || []).map((serie, si) => ({
        ...serie,
        realReps:   execData[`${s.id}-${exIdx}-${si}-reps`]   || '',
        realWeight: execData[`${s.id}-${exIdx}-${si}-weight`] || '',
      }))
    }))
    setSessionEditor({ session: s, items, execData })
    setShowDayDetail(null)
  }

  async function saveSessionEditor() {
    if (!sessionEditor) return
    setSessionEditorSaving(true)
    const { session, items } = sessionEditor
    // Actualizar exercises_data del routine con los nuevos pesos planificados
    const newExData = items.map(ex => ({
      name: ex.name,
      note: ex.note || '',
      series: ex.series.map(s => ({ reps: s.reps, weight: s.weight }))
    }))
    // Actualizar execution_data con los valores reales ingresados
    const newExecData = {}
    items.forEach((ex, exIdx) => {
      ex.series.forEach((s, si) => {
        if (s.realReps)   newExecData[`${session.id}-${exIdx}-${si}-reps`]   = s.realReps
        if (s.realWeight) newExecData[`${session.id}-${exIdx}-${si}-weight`] = s.realWeight
      })
    })
    await Promise.all([
      session.routines?.id
        ? supabase.from('routines').update({ exercises_data: newExData }).eq('id', session.routines.id)
        : Promise.resolve(),
      supabase.from('sessions').update({ execution_data: JSON.stringify(newExecData) }).eq('id', session.id)
    ])
    setSessionEditorSaving(false)
    setSessionEditor(null)
    fetchAll()
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
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: '8px 10px', border: tab===t.id ? '1px solid rgba(74,222,128,0.3)' : 'none',
            background: tab===t.id ? '#222' : 'transparent',
            color: tab===t.id ? '#4ade80' : '#888',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', borderRadius: '8px', transition: 'all .15s', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ROUTINES TAB (online only) */}
      {tab === 'routines' && isOnline && <Routines athleteId={athlete.id} />}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month-1,1))}>← Ant.</button>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{MONTHS[month]} {year}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn sm" style={{ fontSize: '10px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)' }} onClick={() => setShowCycleModal(true)}>+ Ciclo</button>
              <button className="btn sm" onClick={() => setMonthDate(new Date(year,month+1,1))}>Sig. →</button>
            </div>
          </div>

          {/* Ciclos activos */}
          {cycles.length > 0 && (
            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {cycles.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>▶ {c.label}</span>
                    <span style={{ fontSize: '10px', color: '#777' }}>{c.start_date} → {c.end_date}</span>
                  </div>
                  <button onClick={() => deleteCycle(c.id)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: '0 2px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
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
              const evs = dateStr ? eventsForDate(dateStr) : []
              const hasCompleted = ss.some(s => s.completed)
              const hasPending = ss.some(s => !s.completed)
              const hasEvents = evs.length > 0
              const cycle = dateStr ? dateInCycle(dateStr) : null
              const isCycleStart = cycle && dateStr === cycle.start_date
              const isCycleEnd = cycle && dateStr === cycle.end_date
              return (
                <div key={i} onClick={() => {
                    if (!valid) return
                    setShowDayDetail({ date: dateStr, sessions: ss, events: evs })
                  }}
                  style={{
                    background: !valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.08)' : cycle ? 'rgba(167,139,250,0.07)' : isToday ? 'rgba(74,222,128,0.04)' : '#111',
                    border: `1px solid ${!valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.35)' : hasPending ? 'rgba(251,191,36,0.25)' : cycle ? 'rgba(167,139,250,0.3)' : isToday ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '8px', padding: '5px 3px', minHeight: '52px',
                    cursor: valid ? 'pointer' : 'default',
                    position: 'relative'
                  }}>
                  {valid && (
                    <>
                      <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                      {isCycleStart && <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 700, color: '#4ade80', marginTop: '2px', letterSpacing: '.02em' }}>▶ Inicio</div>}
                      {isCycleEnd && <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 700, color: '#f87171', marginTop: '2px', letterSpacing: '.02em' }}>■ Fin</div>}
                      {hasCompleted && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>✓</div>
                        </div>
                      )}
                      {!hasCompleted && hasPending && (() => {
                        const pending = ss.find(s => !s.completed)
                        const time = pending?.scheduled_time
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3px', gap: '2px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #fbbf24', background: 'transparent' }} />
                            {time && <div style={{ fontSize: '8px', color: '#fbbf24', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{time.split(' - ')[0]}</div>}
                          </div>
                        )
                      })()}
                      {hasEvents && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3px' }}>
                          <div style={{ background: '#fb923c', borderRadius: '3px', padding: '1px 3px', fontSize: '7px', fontWeight: 700, color: '#000', maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {evs[0].label.length > 7 ? evs[0].label.slice(0, 6) + '…' : evs[0].label}
                          </div>
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
            <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', marginRight: '4px' }}></span>Pendiente</span>
            <span><span style={{ display: 'inline-block', width: '14px', height: '4px', borderRadius: '2px', background: '#a78bfa', marginRight: '4px', verticalAlign: 'middle' }}></span>Ciclo</span>
            <span><span style={{ display: 'inline-block', width: '14px', height: '8px', borderRadius: '2px', background: '#fb923c', marginRight: '4px', verticalAlign: 'middle' }}></span>Evento</span>
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
            const isExpanded = expandedSessions.has(s.id)
            const exData = (() => { try { const r = s.routines?.exercises_data; return r ? (typeof r === 'string' ? JSON.parse(r) : r) : null } catch { return null } })()
            const execData = (() => { try { return s.execution_data ? JSON.parse(s.execution_data) : null } catch { return null } })()
            return (
              <div key={s.id} style={{ background: '#111', border: `1px solid ${isExpanded ? 'rgba(74,222,128,0.3)' : 'rgba(74,222,128,0.1)'}`, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', transition: 'border-color .15s' }}>
                {/* Header — siempre visible, clic para expandir */}
                <div
                  onClick={() => setExpandedSessions(prev => { const n = new Set(prev); isExpanded ? n.delete(s.id) : n.add(s.id); return n })}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#000', flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{s.routines?.name || 'Sesión'}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>{s.date}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {s.rpe && <span style={{ background: '#1a1a1a', color: '#4ade80', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>RPE {s.rpe}</span>}
                    {s.duration && <span style={{ background: '#1a1a1a', color: '#aaa', padding: '2px 7px', borderRadius: '6px', fontSize: '10px' }}>{s.duration}min</span>}
                    <span style={{ color: '#555', fontSize: '16px', marginLeft: '4px', transition: 'transform .2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {s.log_notes && (
                      <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', margin: '12px 0', background: '#1a1a1a', padding: '8px 12px', borderRadius: '8px' }}>
                        "{s.log_notes}"
                      </div>
                    )}
                    {exData && exData.length > 0
                      ? exData.map((ex, exIdx) => {
                          if (!ex.series?.length) return null
                          return (
                            <div key={exIdx} style={{ marginTop: '12px' }}>
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
                        })
                      : <div style={{ fontSize: '12px', color: '#555', marginTop: '12px' }}>Sin detalle de ejercicios registrado.</div>
                    }
                  </div>
                )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#888' }}>{s.date}</span>
                      {s.scheduled_time && <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600 }}>🕐 {s.scheduled_time}</span>}
                    </div>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button className="btn primary sm" onClick={() => setShowMetricForm(v => !v)}>{showMetricForm ? '— Cancelar' : '+ Nueva medición'}</button>
          </div>
          {showMetricForm && (
            <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>

              {/* Escanear báscula */}
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '10px', marginBottom: '14px', borderRadius: '10px',
                border: '1px dashed rgba(74,222,128,0.4)', cursor: mScanning ? 'wait' : 'pointer',
                background: 'rgba(74,222,128,0.05)', color: mScanning ? '#555' : '#4ade80',
                fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s'
              }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) scanMetrics(e.target.files[0]); e.target.value = '' }}
                  disabled={mScanning} />
                {mScanning ? '⏳ Analizando imagen...' : '📷 Escanear báscula'}
              </label>

              <div className="field"><label>Fecha</label><input type="date" value={mForm.date} onChange={e => setMForm({...mForm, date: e.target.value})} /></div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Composición corporal</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {COMP_FIELDS.map(([k, lbl]) => (
                  <div key={k}>
                    <label style={{ fontSize: '10px', color: '#555', fontWeight: 700, display: 'block', marginBottom: '3px' }}>{lbl}</label>
                    <input type="number" step="0.1" value={mForm[k]} onChange={e => setMForm({...mForm, [k]: e.target.value})} placeholder="—" style={{ padding: '7px 10px', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Circunferencias</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {CIRC_FIELDS.map(([k, lbl]) => (
                  <div key={k}>
                    <label style={{ fontSize: '10px', color: '#555', fontWeight: 700, display: 'block', marginBottom: '3px' }}>{lbl}</label>
                    <input type="number" step="0.1" value={mForm[k]} onChange={e => setMForm({...mForm, [k]: e.target.value})} placeholder="—" style={{ padding: '7px 10px', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div className="field"><label>Nota</label><input value={mForm.note} onChange={e => setMForm({...mForm, note: e.target.value})} placeholder="Observaciones..." /></div>
              <button className="btn primary" style={{ width: '100%' }} onClick={saveMetric} disabled={mSaving}>{mSaving ? 'Guardando...' : 'Guardar medición'}</button>
            </div>
          )}
          {metrics.length === 0 && !showMetricForm && <div className="empty">Sin medidas registradas.</div>}
          {metrics[0]?.ai_analysis && (
            <div style={{ marginBottom: '14px', padding: '14px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Análisis</div>
              <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7, margin: 0 }}>{metrics[0].ai_analysis}</p>
            </div>
          )}
          {metrics.length >= 2 && (
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
              <MetricsChart metrics={metrics} />
            </div>
          )}
          <ProgressShareCard metrics={metrics} athleteName={athleteData?.name || athlete?.name} />
          {metrics.map((m, mIdx) => {
            const compRows = [
              ['Peso',                     m.weight,       'kg'],
              ['Agua corporal',            m.water_l,      'L'],
              ['Masa grasa corporal',      m.fat_kg,       'kg'],
              ['Masa corporal magra',      m.lean_mass_kg, 'kg'],
              ['Masa libre de grasa',      m.fat_free_kg,  'kg'],
              ['MME muscular esquelética', m.muscle_kg,    'kg'],
              ['IMC',                      m.imc,          'kg/m²'],
              ['PGC — % Grasa corporal',   m.body_fat,     '%'],
            ]
            const circRows = [['Brazo der.',m.arm_r],['Brazo izq.',m.arm_l],['Pierna der.',m.leg_r],['Pierna izq.',m.leg_l],['Cintura',m.waist]]
            return (
              <div key={m.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>{m.date}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {m.goal && <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>{m.goal}</span>}
                    <button onClick={async () => { if (!confirm('¿Eliminar medición?')) return; const { error } = await supabase.from('metrics').delete().eq('id', m.id); if (error) alert('Error: ' + error.message); else fetchAll() }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Composición corporal</div>
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                  {compRows.filter(([,v]) => v != null).map(([lbl, val, unit], i) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: i % 2 === 0 ? '#1a1a1a' : '#161616', fontSize: '12px' }}>
                      <span style={{ color: '#aaa' }}>{lbl}</span>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{val} <span style={{ fontSize: '10px', color: '#555' }}>{unit}</span></span>
                    </div>
                  ))}
                </div>
                {circRows.some(([,v]) => v) && (
                  <>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Circunferencias</div>
                    <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                      {circRows.filter(([,v]) => v).map(([lbl, val], i) => (
                        <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: i % 2 === 0 ? '#1a1a1a' : '#161616', fontSize: '12px' }}>
                          <span style={{ color: '#aaa' }}>{lbl}</span>
                          <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{val} <span style={{ fontSize: '10px', color: '#555' }}>cm</span></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {m.note && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', marginTop: '10px' }}>"{m.note}"</div>}
              </div>
            )
          })}
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
              <button className="btn sm" onClick={() => setShowDayDetail(null)}>✕</button>
            </div>

            {/* Action buttons — always visible */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: showDayDetail.sessions?.length || showDayDetail.events?.length ? '14px' : '0' }}>
              <button className="btn primary" style={{ padding: '10px', fontSize: '13px' }} onClick={() => { setSelectedDate(showDayDetail.date); setShowDayDetail(null); isOnline ? setShowAssign(true) : setShowPresencial(true) }}>
                + Sesión
              </button>
              <button className="btn" style={{ padding: '10px', fontSize: '13px', color: '#fb923c', borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.06)' }} onClick={() => { setSelectedDate(showDayDetail.date); setShowDayDetail(null); setShowEventModal(true) }}>
                + Evento
              </button>
            </div>

            {showDayDetail.events?.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {showDayDetail.events.map(ev => (
                  <div key={ev.id} style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fb923c' }}>{ev.label}</div>
                      {ev.notes && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '3px' }}>{ev.notes}</div>}
                    </div>
                    <button onClick={async () => { await deleteEvent(ev.id); setShowDayDetail(null) }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {showDayDetail.sessions.map(s => {
              const exData = (() => { try { const r = s.routines?.exercises_data; return r ? (typeof r === 'string' ? JSON.parse(r) : r) : null } catch { return null } })()
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
                  {s.notes && <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', background: '#1a1a1a', padding: '7px 10px', borderRadius: '7px' }}>📋 {s.notes}</div>}
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn primary sm" style={{ fontSize: '11px', flex: 1 }} onClick={() => openSessionEditor(s)}>✏️ Editar sesión</button>
                    <button className="btn danger sm" style={{ fontSize: '10px' }} onClick={async () => { if(!confirm('¿Eliminar esta sesión?')) return; await supabase.from('sessions').delete().eq('id', s.id); setShowDayDetail(null); fetchAll() }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {showEventModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowEventModal(false)}>
          <div className="modal">
            <h3>Agregar evento — {selectedDate}</h3>
            <div className="field"><label>Tipo de evento</label>
              <input value={eventForm.label} onChange={e => setEventForm({...eventForm, label: e.target.value})} placeholder="Partido, Torneo, Trabajo en casa, Terapia..." autoFocus />
            </div>
            <div className="field"><label>Notas (opcional)</label>
              <textarea rows={2} value={eventForm.notes} onChange={e => setEventForm({...eventForm, notes: e.target.value})} placeholder="Detalles adicionales..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowEventModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveEvent} disabled={!eventForm.label.trim()}>Guardar</button>
            </div>
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
                {routines.length === 0 && <option value="">— Sin rutinas disponibles —</option>}
                {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Fecha</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="field"><label>Horario (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TimeSelect value={assignForm.start_time} onChange={v => setAssignForm({...assignForm, start_time: v})} placeholder="Inicio" />
                <span style={{ color: '#555', fontSize: '12px' }}>a</span>
                <TimeSelect value={assignForm.end_time} onChange={v => setAssignForm({...assignForm, end_time: v})} placeholder="Fin" />
              </div>
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
      {showCycleModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowCycleModal(false)}>
          <div className="modal">
            <h3>Nuevo ciclo</h3>
            <div className="field">
              <label>Nombre del ciclo</label>
              <input value={cycleForm.label} onChange={e => setCycleForm({...cycleForm, label: e.target.value})} placeholder="Ciclo 1, Marzo-Abril..." />
            </div>
            <div className="field">
              <label>Fecha de inicio</label>
              <input type="date" value={cycleForm.start_date} onChange={e => setCycleForm({...cycleForm, start_date: e.target.value})} />
            </div>
            <div className="field">
              <label>Fecha de fin</label>
              <input type="date" value={cycleForm.end_date} onChange={e => setCycleForm({...cycleForm, end_date: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowCycleModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveCycle}>Guardar ciclo</button>
            </div>
          </div>
        </div>
      )}

      {showPresencial && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowPresencial(false)}>
          <div className="modal">
            <h3>Sesión presencial — {selectedDate}</h3>
            <div className="field"><label>Horario (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TimeSelect value={presencialForm.start_time} onChange={v => setPresencialForm({...presencialForm, start_time: v})} placeholder="Inicio" />
                <span style={{ color: '#555', fontSize: '12px' }}>a</span>
                <TimeSelect value={presencialForm.end_time} onChange={v => setPresencialForm({...presencialForm, end_time: v})} placeholder="Fin" />
              </div>
            </div>
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
      {/* SESSION EDITOR MODAL */}
      {sessionEditor && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSessionEditor(null)}>
          <div className="modal" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ margin: 0 }}>{sessionEditor.session.routines?.name || 'Sesión'}</h3>
              <button className="btn sm" onClick={() => setSessionEditor(null)}>✕</button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '16px' }}>{sessionEditor.session.date}</div>

            {sessionEditor.items.map((ex, exIdx) => (
              <div key={exIdx} style={{ marginBottom: '16px', background: 'var(--bg3)', borderRadius: '10px', padding: '12px 14px' }}>
                {/* Nombre del ejercicio */}
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text1)', marginBottom: '4px' }}>{ex.name}</div>
                {ex.note && <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>{ex.note}</div>}

                {/* Tabla de series */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 1fr', gap: '4px', alignItems: 'center' }}>
                  {/* Headers */}
                  <div />
                  {['Reps plan','Kg plan','Reps real','Kg real'].map(h => (
                    <div key={h} style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center', paddingBottom: '4px' }}>{h}</div>
                  ))}
                  {ex.series.map((serie, si) => (
                    <>
                      <div key={`lbl-${si}`} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>S{si+1}</div>
                      {/* Reps plan */}
                      <input key={`rp-${si}`} type="text" value={serie.reps} onChange={e => {
                        const items = sessionEditor.items.map((ex2, i2) => i2 !== exIdx ? ex2 : { ...ex2, series: ex2.series.map((s2, j) => j !== si ? s2 : { ...s2, reps: e.target.value }) })
                        setSessionEditor(se => ({ ...se, items }))
                      }} style={{ padding: '5px 6px', fontSize: '12px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)' }} />
                      {/* Kg plan */}
                      <input key={`wp-${si}`} type="text" value={serie.weight} onChange={e => {
                        const items = sessionEditor.items.map((ex2, i2) => i2 !== exIdx ? ex2 : { ...ex2, series: ex2.series.map((s2, j) => j !== si ? s2 : { ...s2, weight: e.target.value }) })
                        setSessionEditor(se => ({ ...se, items }))
                      }} style={{ padding: '5px 6px', fontSize: '12px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)' }} placeholder="—" />
                      {/* Reps real */}
                      <input key={`rr-${si}`} type="text" value={serie.realReps} onChange={e => {
                        const items = sessionEditor.items.map((ex2, i2) => i2 !== exIdx ? ex2 : { ...ex2, series: ex2.series.map((s2, j) => j !== si ? s2 : { ...s2, realReps: e.target.value }) })
                        setSessionEditor(se => ({ ...se, items }))
                      }} style={{ padding: '5px 6px', fontSize: '12px', textAlign: 'center', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }} placeholder="—" />
                      {/* Kg real */}
                      <input key={`wr-${si}`} type="text" value={serie.realWeight} onChange={e => {
                        const items = sessionEditor.items.map((ex2, i2) => i2 !== exIdx ? ex2 : { ...ex2, series: ex2.series.map((s2, j) => j !== si ? s2 : { ...s2, realWeight: e.target.value }) })
                        setSessionEditor(se => ({ ...se, items }))
                      }} style={{ padding: '5px 6px', fontSize: '12px', textAlign: 'center', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }} placeholder="—" />
                    </>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn" onClick={() => setSessionEditor(null)}>Cancelar</button>
              <button className="btn primary" onClick={saveSessionEditor} disabled={sessionEditorSaving}>
                {sessionEditorSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
