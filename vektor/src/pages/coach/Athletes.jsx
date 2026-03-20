import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AthleteProfile from './AthleteProfile'

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sport: 'Fútbol', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'athlete').order('name'),
      supabase.from('sessions').select('id,athlete_id,completed')
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

  const initials = name => name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
  const sports = ['Fútbol', 'Atletismo', 'Natación', 'Baloncesto', 'Ciclismo', 'Tenis', 'Gym', 'Otro']

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
        return (
          <div key={a.id} onClick={() => setSelected(a)}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
              {initials(a.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{a.name}</div>
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{a.sport} · {total} sesiones · {done} completadas</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{a.sport}</span>
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
