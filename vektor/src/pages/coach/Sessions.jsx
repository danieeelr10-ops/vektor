import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Sessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [athletes, setAthletes] = useState([])
  const [routines, setRoutines] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ athlete_id:'', routine_id:'', date:'', notes:'' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: s }, { data: a }, { data: r }] = await Promise.all([
      supabase.from('sessions').select('*, profiles(name), routines(name)').eq('coach_id', user.id).order('date', { ascending:false }),
      supabase.from('profiles').select('id,name').eq('role','athlete'),
      supabase.from('routines').select('id,name').eq('coach_id', user.id)
    ])
    setSessions(s || [])
    setAthletes(a || [])
    setRoutines(r || [])
    if (a?.length) setForm(f => ({ ...f, athlete_id: a[0].id, date: today }))
    if (r?.length) setForm(f => ({ ...f, routine_id: r[0].id }))
  }

  async function saveSession() {
    if (!form.athlete_id || !form.routine_id || !form.date) return
    await supabase.from('sessions').insert({ ...form, coach_id: user.id, completed: false })
    setShowModal(false); fetchAll()
  }

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <span className="stitle">Sesiones asignadas</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Sesión</button>
      </div>
      {!sessions.length && <div className="empty">Sin sesiones asignadas aún.</div>}
      {sessions.map(s => (
        <div className="card" key={s.id} style={{ marginBottom:'10px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:'14px' }}>{s.profiles?.name || '—'}</div>
              <div style={{ fontSize:'12px', color:'var(--text2)' }}>{s.routines?.name} · {s.date}</div>
            </div>
            {s.completed ? <span className="badge green">Completada</span> : <span className="badge amber">Pendiente</span>}
          </div>
          {s.completed && (
            <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'6px', background:'var(--bg3)', padding:'8px 10px', borderRadius:'8px' }}>
              RPE {s.rpe} · {s.duration} min{s.log_notes ? ` · "${s.log_notes}"` : ''}
            </div>
          )}
          {s.notes && !s.completed && <div style={{ fontSize:'12px', color:'var(--text3)', marginTop:'6px' }}>📋 {s.notes}</div>}
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Asignar sesión</h3>
            <div className="field"><label>Atleta</label>
              <select value={form.athlete_id} onChange={e=>setForm({...form,athlete_id:e.target.value})}>
                {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
            <div className="field"><label>Rutina</label>
              <select value={form.routine_id} onChange={e=>setForm({...form,routine_id:e.target.value})}>
                {routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select></div>
            <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
            <div className="field"><label>Notas para el atleta</label><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Indicaciones especiales..." /></div>
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
