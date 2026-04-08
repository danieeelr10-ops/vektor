import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import AthleteDashboard from '../athlete/index'
import Athletes from './Athletes'
import CoachAgenda from './Agenda'
import CSVImporter from './CSVImporter'
import Invitations from './Invitations'
import CoachMetrics from './Metrics'

const TABS = [
  { id:'athletes', label:'Atletas' },
  { id:'agenda', label:'Agenda' },
  { id:'metrics', label:'Métricas' },
  { id:'import', label:'Importar' },
  { id:'invitations', label:'Invitaciones' },
]

export default function CoachDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('athletes')
  const [athleteMode, setAthleteMode] = useState(false)

  if (athleteMode) return (
    <div>
      <div className="topbar">
        <div className="logo">
          <img src="/logo-vektor.png" alt="Vektor Training" style={{ height:'48px', width:'auto' }} />
          <span style={{ fontSize:'9px', fontWeight:700, textTransform:'uppercase', padding:'2px 6px', borderRadius:'4px', marginLeft:'6px', background:'rgba(74,222,128,0.15)', color:'#4ade80' }}>Mi entreno</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => setAthleteMode(false)} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(96,165,250,0.12)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:'8px', padding:'5px 10px', color:'#60a5fa', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ← Vista Coach
          </button>
          <button className="btn sm ghost" onClick={signOut}>Salir</button>
        </div>
      </div>
      <AthleteDashboard coachAsAthlete={true} />
    </div>
  )

  return (
    <div>
      <div className="topbar">
        <div className="logo">
          <img src="/logo-vektor.png" alt="Vektor Training" style={{ height:'48px', width:'auto' }} />
          <span style={{ fontSize:'10px', color:'var(--text3)', fontWeight:400 }}>Coach</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => setAthleteMode(true)} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'8px', padding:'5px 10px', color:'#4ade80', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            🏋️ Mi entreno
          </button>
          <span className="topbar-name" style={{ fontSize:'12px', color:'var(--text2)' }}>{profile?.name}</span>
          <button className="btn sm ghost" onClick={signOut}>Salir</button>
        </div>
      </div>
      <div className="nav-tabs" style={{ display:'flex', background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 20px', gap:'2px', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="nav-tab-btn" style={{
            padding:'12px 14px', border:'none', background:'transparent',
            color: tab===t.id ? 'var(--green)' : 'var(--text2)',
            fontFamily:'var(--font)', fontSize:'12px', fontWeight:600,
            cursor:'pointer', borderBottom:`2px solid ${tab===t.id?'var(--green)':'transparent'}`,
            whiteSpace:'nowrap', transition:'all .15s'
          }}>{t.label}</button>
        ))}
      </div>
      <div className={tab === 'athletes' ? 'page-wide' : 'page'}>
        {tab==='athletes' && <Athletes />}
        {tab==='agenda' && <CoachAgenda />}
        {tab==='metrics' && <CoachMetrics />}
        {tab==='import' && <CSVImporter />}
        {tab==='invitations' && <Invitations />}
      </div>
    </div>
  )
}
