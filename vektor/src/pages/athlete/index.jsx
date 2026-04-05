import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Metrics, RMMaximo, Notifications } from './Tabs'
import AthleteCalendar from './AthleteCalendar'
import SessionHistory from './SessionHistory'
import AthleteDashboardView from './AthleteDashboardView'

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
          <div className="logo-mark">V</div>
          Vektor <span>Training</span>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', background: isOnline ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)', color: isOnline ? '#60a5fa' : '#a78bfa' }}>
            {isOnline ? 'Online' : 'Presencial'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="topbar-name" style={{ fontSize: '12px', color: 'var(--text2)' }}>{profile?.name}</span>
          <button className="btn sm ghost" onClick={signOut}>Salir</button>
        </div>
      </div>
      <div className="nav-tabs" style={{ display: 'flex', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: '2px', overflowX: 'auto' }}>
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
