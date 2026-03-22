import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import CoachDashboard from './pages/coach/index'
import AthleteDashboard from './pages/athlete/index'

export default function App() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ fontSize:'13px', color:'var(--text3)', letterSpacing:'.08em' }}>CARGANDO...</div>
    </div>
  )

  if (!user) return <Login />

  // Pending approval screen
  if (profile?.role === 'athlete' && profile?.status === 'pending') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:'360px', textAlign:'center' }}>
        <div style={{ width:'72px', height:'72px', background:'var(--green)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'32px', fontWeight:'900', color:'#000' }}>V</div>
        <h2 style={{ fontWeight:700, marginBottom:'10px' }}>Cuenta en revisión</h2>
        <p style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7, marginBottom:'20px' }}>
          Tu cuenta está pendiente de aprobación por tu entrenador. En cuanto la apruebe podrás ingresar.
        </p>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px', marginBottom:'20px', fontSize:'12px', color:'var(--text2)' }}>
          <strong style={{ color:'var(--green)' }}>{profile.name}</strong><br />
          {profile.email}
        </div>
        <button className="btn" style={{ width:'100%' }} onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )

  if (profile?.role === 'coach') return <CoachDashboard />
  if (profile?.role === 'athlete') return <AthleteDashboard />

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ fontSize:'13px', color:'var(--text3)' }}>Configurando perfil...</div>
    </div>
  )
}
