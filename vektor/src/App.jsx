import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import CoachDashboard from './pages/coach/index'
import AthleteDashboard from './pages/athlete/index'

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ fontSize:'13px', color:'var(--text3)', letterSpacing:'.08em' }}>CARGANDO...</div>
    </div>
  )

  if (!user) return <Login />
  if (profile?.role === 'coach') return <CoachDashboard />
  if (profile?.role === 'athlete') return <AthleteDashboard />

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ fontSize:'13px', color:'var(--text3)' }}>Configurando perfil...</div>
    </div>
  )
}
