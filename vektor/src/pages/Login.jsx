import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SPORTS = ['Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Gym','Otro']

export default function Login() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('Fútbol')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')

    // 1. Validate invitation code
    const { data: invite, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('used', false)
      .single()

    if (invErr || !invite) {
      setError('Código de invitación inválido o ya utilizado.')
      setLoading(false); return
    }

    // 2. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Error al crear usuario.'); setLoading(false); return }

    // 3. Create profile as pending athlete
    await supabase.from('profiles').insert({
      id: userId,
      name,
      email,
      sport,
      role: 'athlete',
      mode: 'online',
      status: 'pending',
      coach_id: invite.coach_id
    })

    // 4. Mark invitation as used
    await supabase.from('invitations').update({ used: true, used_by: userId }).eq('id', invite.id)

    setLoading(false)
    setSuccess(true)
  }

  const Logo = () => (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <img src="/logo-vektor.png" alt="Vektor Training" style={{ height: '90px', width: 'auto', margin: '0 auto 12px', display: 'block' }} />
      <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>Plataforma de entrenamiento deportivo</p>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <Logo />
        <div className="card">
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--green)', marginBottom: '8px' }}>¡Cuenta creada!</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>
            Tu cuenta está pendiente de aprobación por tu entrenador. Te avisará cuando esté activa.
          </div>
          <button className="btn primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => { setMode('login'); setSuccess(false) }}>
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <Logo />

        {/* Tab toggle */}
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px' }}>
          {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([id,lbl]) => (
            <button key={id} onClick={() => { setMode(id); setError('') }} style={{
              flex: 1, padding: '8px', border: mode===id ? '1px solid var(--border2)' : 'none',
              background: mode===id ? 'var(--bg3)' : 'transparent',
              color: mode===id ? 'var(--green)' : 'var(--text2)',
              fontFamily: 'var(--font)', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', borderRadius: '8px', transition: 'all .15s'
            }}>{lbl}</button>
          ))}
        </div>

        <div className="card">
          {mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}
              <button className="btn primary" style={{ width: '100%', marginTop: '4px', padding: '12px' }} disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="field">
                <label>Código de invitación</label>
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="Ej: VTK-A3X9" required style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }} />
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>Solicítalo a tu entrenador</div>
              </div>
              <div className="field">
                <label>Nombre completo</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <div className="field">
                <label>Deporte principal</label>
                <select value={sport} onChange={e => setSport(e.target.value)}>
                  {SPORTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}
              <button className="btn primary" style={{ width: '100%', marginTop: '4px', padding: '12px' }} disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
