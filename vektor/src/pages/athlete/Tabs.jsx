import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function Today() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [showLog, setShowLog] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', log_notes: '' })

  useEffect(() => { fetchToday() }, [])

  async function fetchToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('sessions').select('*, routines(name,description)').eq('athlete_id', user.id).eq('date', today)
    setSessions(data || [])
  }

  async function completeSession() {
    await supabase.from('sessions').update({ completed: true, rpe: rpe || '?', duration: logForm.duration, log_notes: logForm.log_notes }).eq('id', showLog)
    setShowLog(null); setRpe(null); setLogForm({ duration: '', log_notes: '' }); fetchToday()
  }

  if (!sessions.length) return (
    <div className="fade-in">
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Sin sesión para hoy</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Tu entrenador asignará tu próxima sesión pronto.</div>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="stitle" style={{ marginBottom: '12px' }}>Sesión de hoy</div>
      {sessions.map(s => (
        <div className="card green-border" key={s.id} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{s.routines?.name}</div>
            {s.completed ? <span className="badge green">Completada</span> : <span className="badge amber">Pendiente</span>}
          </div>
          {s.notes && <div style={{ background: 'var(--green-dim)', borderLeft: '3px solid var(--green)', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>{s.notes}</div>}
          {s.routines?.description && <div style={{ fontSize: '13px', color: 'var(--text2)', whiteSpace: 'pre-line', background: 'var(--bg3)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>{s.routines.description}</div>}
          {!s.completed && <button className="btn primary" style={{ width: '100%', padding: '12px' }} onClick={() => setShowLog(s.id)}>Marcar como completada</button>}
          {s.completed && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>RPE: <strong style={{ color: 'var(--green)' }}>{s.rpe}</strong> · Duración: <strong style={{ color: 'var(--green)' }}>{s.duration} min</strong>{s.log_notes && <><br /><span style={{ fontStyle: 'italic' }}>"{s.log_notes}"</span></>}</div>}
        </div>
      ))}
      {showLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLog(null)}>
          <div className="modal">
            <h3>Registrar sesión completada</h3>
            <div className="field">
              <label>Esfuerzo percibido (RPE 1-10)</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setRpe(n)} style={{ flex: 1, minWidth: '30px', padding: '8px 4px', border: `1px solid ${rpe===n?'var(--green)':'var(--border)'}`, borderRadius: '8px', background: rpe===n?'var(--green-dim)':'var(--bg3)', color: rpe===n?'var(--green)':'var(--text2)', cursor: 'pointer', fontSize: '13px', fontWeight: rpe===n?700:400, fontFamily: 'var(--font)', transition: 'all .15s' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="field"><label>Duración (minutos)
