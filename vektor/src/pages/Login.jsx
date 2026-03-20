import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--green)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '36px', fontWeight: '900', color: '#000' }}>V</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em' }}>
            Vektor <span style={{ color: 'var(--green)' }}>Training</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>Plataforma de entrenamiento deportivo</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
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
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text3)', marginTop: '16px' }}>
          El entrenador crea las cuentas de los atletas.
        </p>
      </div>
    </div>
  )
}
