import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Athletes() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'', sport:'Fútbol', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role','athlete'),
      supabase.from('sessions').select('id,athlete_id')
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
    setForm({ name:'', sport:'Fútbol', email:'', password:'' })
    fetchAll()
  }

  const initials = name => name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)
  const sports = ['Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Gym','Otro']

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <span className="stitle">Mis atletas ({athletes.length})</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Atleta</button>
      </div>
      {!athletes.length && <div className="empty">Aún no tienes atletas registrados.</div>}
      {athletes.map(a => {
        const count = sessions.filter(s => s.athlete_id===a.id).length
        return (
          <div className="card" key={a.id} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
            <div className="avatar">{initials(a.name)}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:'14px' }}>{a.name}</div>
              <div style={{ fontSize:'12px', color:'var(--text2)' }}>{a.email} · {count} sesiones</div>
            </div>
            <span className="badge green">{a.sport}</span>
          </div>
        )
      })}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Nuevo atleta</h3>
            <div className="field"><label>Nombre completo</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Carlos López" /></div>
            <div className="field"><label>Deporte</label>
              <select value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})}>
                {sports.map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div className="field"><label>Correo (para login)</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="atleta@correo.com" /></div>
            <div className="field"><label>Contraseña inicial</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" /></div>
            {msg && <p style={{ color:'var(--red)', fontSize:'12px', marginBottom:'10px' }}>{msg}</p>}
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={createAthlete} disabled={loading}>{loading?'Creando...':'Crear atleta'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
