import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Metrics, RMMaximo, Notifications } from './Tabs'
import AthleteCalendar from './AthleteCalendar'
import SessionHistory from './SessionHistory'
import AthleteDashboardView from './AthleteDashboardView'
import { supabase } from '../../lib/supabase'

function WelcomeBanner({ profile, onGoToCalendar }) {
  const [todaySession, setTodaySession] = useState(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('sessions').select('id,completed,routines(name)').eq('athlete_id', profile.id).eq('date', today).maybeSingle()
      .then(({ data }) => setTodaySession(data))
    supabase.from('sessions').select('date,completed').eq('athlete_id', profile.id).eq('completed', true).order('date', { ascending: false }).limit(30)
      .then(({ data }) => {
        if (!data?.length) return
        let s = 0
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
        let prev = null
        for (const d of sorted) {
          const cur = new Date(d.date)
          if (!prev) { s = 1; prev = cur; continue }
          const diff = (prev - cur) / (1000*60*60*24)
          if (diff <= 2) { s++; prev = cur } else break
        }
        setStreak(s)
      })
  }, [profile?.id])

  const firstName = profile?.name?.split(' ')[0] || 'Atleta'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div style={{ padding: '16px 20px 0', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'stretch' }}>
      {/* Left hero card */}
      <div style={{
        position: 'relative', borderRadius: '16px', padding: '24px 28px', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f1f0f 0%, #0a1a0a 100%)',
        border: '1px solid rgba(74,222,128,0.15)',
        minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        {/* glow */}
        <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '4px' }}>{greeting} 👋</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-.02em', marginBottom: '8px' }}>{firstName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
            {todaySession
              ? todaySession.completed
                ? 'Sesión de hoy completada. ¡Buen trabajo!'
                : `Tienes "${todaySession.routines?.name || 'una sesión'}" pendiente hoy.`
              : 'Sin sesión programada para hoy.'}
          </div>
        </div>
        <button onClick={onGoToCalendar} style={{
          marginTop: '16px', alignSelf: 'flex-start',
          background: 'var(--green)', color: '#000', border: 'none',
          borderRadius: '8px', padding: '8px 18px', fontSize: '12px',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
        }}>Ver calendario</button>
      </div>

      {/* Right stats card */}
      <div style={{
        borderRadius: '16px', padding: '20px 22px',
        background: '#111', border: '1px solid rgba(255,255,255,0.07)',
        minWidth: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '9px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Racha</div>
        <div style={{ fontSize: '40px', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--mono)' }}>
          {streak}<span style={{ fontSize: '14px', color: 'var(--text3)', marginLeft: '3px' }}>días</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>sesiones completadas consecutivas</div>
      </div>
    </div>
  )
}

export default function AthleteDashboard({ coachAsAthlete = false }) {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('calendar')
  const isOnline = profile?.mode !== 'presencial'

  const TABS = [
    { id: 'calendar', label: 'Calendario' },
    { id: 'history', label: 'Historial' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'rm', label: 'RM' },
    { id: 'progress', label: 'Progreso' },
    { id: 'notif', label: '🔔' },
  ]

  return (
    <div>
      <div className="topbar">
        <div className="logo">
          <img src="/logo-vektor.png" alt="Vektor Training" style={{ height:'48px', width:'auto' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', background: isOnline ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)', color: isOnline ? '#60a5fa' : '#a78bfa' }}>
            {isOnline ? 'Online' : 'Presencial'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="topbar-name" style={{ fontSize: '12px', color: 'var(--text2)' }}>{profile?.name}</span>
          <button className="btn sm ghost" onClick={signOut}>Salir</button>
        </div>
      </div>

      <WelcomeBanner profile={profile} onGoToCalendar={() => setTab('calendar')} />

      <div className="nav-tabs" style={{ display: 'flex', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: '2px', overflowX: 'auto', marginTop: '16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="nav-tab-btn" style={{
            padding: '12px 14px', border: 'none', background: 'transparent',
            color: tab === t.id ? 'var(--green)' : 'var(--text2)',
            fontFamily: 'var(--font)', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', borderBottom: `2px solid ${tab === t.id ? 'var(--green)' : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all .15s'
          }}>{t.label}</button>
        ))}
      </div>
      <div className="page">
        {tab === 'calendar' && <AthleteCalendar />}
        {tab === 'history' && <SessionHistory />}
        {tab === 'metrics' && <Metrics />}
        {tab === 'rm' && <RMMaximo />}
        {tab === 'progress' && <AthleteDashboardView />}
        {tab === 'notif' && <Notifications />}
      </div>
    </div>
  )
}
