import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Athletes from './Athletes'
import Routines from './Routines'
import Sessions from './Sessions'
import Calendar from '../shared/Calendar'

const TABS = [
  { id:'athletes', label:'Atletas' },
  { id:'routines', label:'Rutinas' },
  { id:'sessions', label:'Sesiones' },
  { id:'calendar', label:'Calendario' },
]

export default function CoachDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('athletes')

  return (
    <div>
      <div className="topbar">
        <div className="logo">
          <div className="logo-mark">V</div>
          Vektor <span>Training</span>
          <span style={{ fontSize:'10px', color:'var(--text3)', fontWeight:400 }}>Coach</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'12px', color:'var(--text2)' }}>{profile?.name}</span>
          <button className="btn sm ghost" onClick={signOut}>Salir</button>
        </div>
      </div>
      <div className="page">
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {tab==='athletes' && <Athletes />}
        {tab==='routines' && <Routines />}
        {tab==='sessions' && <Sessions />}
        {tab==='calendar' && <Calendar />}
      </div>
    </div>
  )
}
