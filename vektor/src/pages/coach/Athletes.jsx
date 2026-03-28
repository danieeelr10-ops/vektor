import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AthleteProfile from './AthleteProfile'

function getActivityStatus(sessions, athleteId) {
  const s = sessions.filter(x => x.athlete_id === athleteId)
  if (!s.length) return { label: 'Sin sesiones', dot: '#555' }
  const days = Math.floor((new Date() - new Date(s[0].date)) / (1000 * 60 * 60 * 24))
  if (days <= 14) return { label: 'Activo', dot: '#4ade80' }
  if (days <= 30) return { label: 'Reciente', dot: '#fbbf24' }
  return { label: 'Inactivo', dot: '#555' }
}

function getPaymentStatus(payments, athleteId) {
  const p = payments.filter(x => x.athlete_id === athleteId)
  if (!p.length) return { label: 'Sin paquete', color: '#555', bg: 'rgba(255,255,255,0.06)', remaining: 0, total: 0 }
  const last = p[0]
  const remaining = (last.sessions_purchased || 0) - (last.sessions_used || 0)
  if (remaining <= 0) return { label: 'Sesiones agotadas', color: '#f87171', bg: 'rgba(248,113,113,0.12)', remaining: 0, total: last.sessions_purchased }
  if (remaining <= 2) return { label: `${remaining} ses. restantes`, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', remaining, total: last.sessions_purchased }
  return { label: `${remaining}/${last.sessions_purchased} sesiones`, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', remaining, total: last.sessions_purchased }
}

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState([])
  const [payments, setPayments] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAthlete, setPayAthlete] = useState(null)
  const [form, setForm] = useState({ name: '', sport: 'Fútbol', email: '', password: '', mode: 'online' })
  const [payForm, setPayForm] = useState({ sessions_purchased: '', amount: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const sports = ['Fútbol', 'Atletismo', 'Natación', 'Baloncesto', 'Ciclismo', 'Tenis', 'Gym', 'Otro']

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: a }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'athlete').order('name'),
      supabase.from('sessions').select('id,athlete_id,completed,date').order('date', { ascending: false }),
      supabase.from('payments').select('*').order('date', { ascending: false })
    ])
    setAthletes(a || [])
    setSessions(s || [])
    setPayments(p || [])
  }

  async function createAthlete() {
    if (!form.name || !form.email || !form.password) return
    setLoading(true); setMsg('')
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: form.email, password: form.password, email_confirm: true,
      user_metadata: { name: form.name, sport: form.sport, role: 'athlete' }
    })
    if (authErr) { setMsg('Error: ' + authErr.message); setLoading(false); return }
    await supabase.from('profiles').insert({ id: authData.user.id, name: form.name, sport: form.sport, role: 'athlete', email: form.email, mode: form.mode })
    setLoading(false); setShowModal(false)
    setForm({ name: '', sport: 'Fútbol', email: '', password: '' })
    fetchAll()
  }

  async function savePayment() {
    if (!payForm.sessions_purchased || !payAthlete) return
    setLoading(true)
    await supabase.from('payments').insert({
      athlete_id: payAthlete.id,
      sessions_purchased: parseInt(payForm.sessions_purchased),
      sessions_used: 0,
      amount: payForm.amount ? parseFloat(payForm.amount) : null,
      date: new Date().toISOString().split('T')[0],
      note: payForm.note
    })
    setLoading(false); setShowPayModal(false)
    setPayForm({ sessions_purchased: '', amount: '', note: '' })
    fetchAll()
  }

  function initials(name) {
    return name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
  }

  const athleteList = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span className="stitle">Mis atletas ({athletes.length})</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Atleta</button>
      </div>

      {!athletes.length && <div className="empty">Aún no tienes atletas registrados.</div>}

      {athletes.map(a => {
        const total = sessions.filter(s => s.athlete_id === a.id).length
        const done = sessions.filter(s => s.athlete_id === a.id && s.completed).length
        const lastSession = sessions.filter(s => s.athlete_id === a.id)[0]
        const activity = getActivityStatus(sessions, a.id)
        const payment = getPaymentStatus(payments, a.id)

        return (
          <div key={a.id} style={{ background: selected?.id === a.id ? 'rgba(74,222,128,0.05)' : '#111', border: `1px solid ${selected?.id === a.id ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', transition: 'border-color .15s, background .15s' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={() => setSelected(a)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#4ade80' }}>
                  {initials(a.name)}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: activity.dot, border: '2px solid #111' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{a.name}</div>
                  <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 6px', borderRadius: '4px', background: a.mode === 'presencial' ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.15)', color: a.mode === 'presencial' ? '#a78bfa' : '#60a5fa' }}>
                    {a.mode === 'presencial' ? 'Presencial' : 'Online'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: '4px' }}>{a.sport}</span>
                  <span style={{ fontSize: '10px', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: '4px' }}>{total} ses.</span>
                  <span style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.08)', padding: '1px 7px', borderRadius: '4px' }}>{done} ✓</span>
                  {lastSession && <span style={{ fontSize: '10px', color: '#555', padding: '1px 0' }}>{lastSession.date}</span>}
                </div>
              </div>
              <span style={{ color: '#555', fontSize: '18px', flexShrink: 0 }}>›</span>
            </div>

            {/* Payment row */}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: payment.total > 0 ? '6px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '11px', color: '#555' }}>Paquete:</span>
                  <span style={{ background: payment.bg, color: payment.color, padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{payment.label}</span>
                </div>
                <button
                  className="btn sm"
                  onClick={e => { e.stopPropagation(); setPayAthlete(a); setShowPayModal(true) }}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  + Pago
                </button>
              </div>
              {payment.total > 0 && (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '5px' }}>
                    <div style={{ background: payment.color, borderRadius: '99px', height: '5px', width: `${Math.min(100, ((payment.total - payment.remaining) / payment.total) * 100)}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', textAlign: 'right' }}>{payment.total - payment.remaining}/{payment.total} sesiones</div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* New athlete modal */}

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
            <div className="field"><label>Modo de entrenamiento</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                <option value="online">🌐 Online / A distancia</option>
                <option value="presencial">🏋️ Presencial</option>
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

      {/* Payment modal */}
      {showPayModal && payAthlete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal">
            <h3>Registrar pago — {payAthlete.name}</h3>
            <div className="field">
              <label>Sesiones compradas</label>
              <input type="number" value={payForm.sessions_purchased} onChange={e => setPayForm({ ...payForm, sessions_purchased: e.target.value })} placeholder="8" />
            </div>
            <div className="field">
              <label>Monto recibido (opcional)</label>
              <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="150000" />
            </div>
            <div className="field">
              <label>Nota (opcional)</label>
              <input value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} placeholder="Transferencia, efectivo..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowPayModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={savePayment} disabled={loading}>{loading ? 'Guardando...' : 'Registrar pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="athletes-layout">
      <div className={`athletes-list-col${selected ? ' hide' : ''}`}>
        {athleteList}
      </div>
      <div className={`athletes-profile-col${!selected ? ' hide' : ''}`}>
        {selected
          ? <AthleteProfile athlete={selected} onBack={() => { setSelected(null); fetchAll() }} onUpdate={(updated) => setSelected({ ...selected, ...updated })} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: '13px' }}>Selecciona un atleta</div>
        }
      </div>
    </div>
  )
}
