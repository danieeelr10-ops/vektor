import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AthleteProfile from './AthleteProfile'

function getStatus(sessions, athleteId) {
  const athleteSessions = sessions.filter(s => s.athlete_id === athleteId)
  if (!athleteSessions.length) return { label: 'Sin sesiones', color: '#555', bg: 'rgba(255,255,255,0.06)' }
  const last = athleteSessions[0]
  const days = Math.floor((new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24))
  if (days <= 14) return { label: 'Activo', color: '#4ade80', bg: 'rgba(74,222,128,0.12)', dot: '#4ade80' }
  if (days <= 30) return { label: 'Reciente', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', dot: '#fbbf24' }
  return { label: 'Inactivo', color: '#888', bg: 'rgba(255,255,255,0.06)', dot: '#555' }
}

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sport: 'Fútbol', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const sports = ['Fútbol', 'Atletismo', 'Natación', 'Baloncesto', 'Ciclismo', 'Tenis', 'Gym', 'Otro']

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'athlete').order('name'),
      supabase.from('sessions').select('id,athlete_id,completed,date').order('date', { ascending: false })
    ])
    setAthletes(a || [])
    setSessions(s || [])
  }

  async function createAthlete() {
    if (!form.name || !form.email || !form.password) return
    setLoading(true); setMsg('')
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: form.email, password: form.password, email_confirm: true,
      user_metadata: { name: form.name, sport: form.sport, role: 'athlete' }
    })
    if (authErr) { setMsg('Error: ' + authErr.message); setLoading(false); return }
    await supabase.from('profiles').insert({ id: authData.user.id, name: form.name, sport: form.sport, role: 'athlete', email: form.email })
    setLoading(false); setShowModal(false)
    setForm({ name: '', sport: 'Fútbol', email: '', password: '' })
    fetchAll()
  }

  function initials(name) {
    return name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
  }

  if (selected) {
    return <AthleteProfile athlete={selected} onBack={() => { setSelected(null); fetchAll() }} />
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span className="stitle">Mis atletas ({athletes.length})</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Atleta</button>
      </div>

      {!athletes.length && <div className="empty">Aún no tienes atletas registrados.</div>}

      {athletes.map(a => {
        const total = sessions.filter(s => s.athlete_id === a.id).length
        const done = sessions.filter(s => s.athlete_id === a.id && s.completed).length
        const lastSession = sessions.filter(s => s.athlete_id === a.id)[0]
        const status = getStatus(sessions, a.id)
        return (
          <div
            key={a.id}
            onClick={() => setSelected(a)}
            style={{ background: '#111', border: `1px solid ${status.dot === '#4ade80' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = status.dot === '#4ade80' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)'}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#4ade80' }}>
                {initials(a.name)}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: status.dot || '#555', border: '2px solid #111' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{a.name}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>
                {a.sport} · {total} sesiones · {done} completadas
                {lastSession ? ` · última: ${lastSession.date}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>{status.label}</span>
              <span style={{ color: '#555', fontSize: '18px' }}>›</span>
            </div>
          </div>
        )
      })}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Nuevo atleta</h3>
            <div className="field"><label>Nombre completo</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Carlos López" /></div>
            <div className="field"><label>Deporte</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}>
                {sports.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Correo (para login)</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="atleta@correo.com" /></div>
            <div className="field"><label>Contraseña inicial</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></div>
            {msg && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={createAthlete} disabled={loading}>{loading ? 'Creando...' : 'Crear atleta'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
