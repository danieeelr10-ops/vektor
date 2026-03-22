import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Athletes from './Athletes'
import Routines from './Routines'
import CoachAgenda from './Agenda'
import CSVImporter from './CSVImporter'
import Invitations from './Invitations'
import CoachMetrics from './Metrics'

const TABS = [
  { id:'athletes', label:'Atletas' },
  { id:'routines', label:'Rutinas' },
  { id:'agenda', label:'Agenda' },
  { id:'metrics', label:'Métricas' },
  { id:'import', label:'Importar' },
  { id:'invitations', label:'Invitaciones' },
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
      <div style={{ display:'flex', background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 20px', gap:'2px', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'12px 14px', border:'none', background:'transparent',
            color: tab===t.id ? 'var(--green)' : 'var(--text2)',
            fontFamily:'var(--font)', fontSize:'12px', fontWeight:600,
            cursor:'pointer', borderBottom:`2px solid ${tab===t.id?'var(--green)':'transparent'}`,
            whiteSpace:'nowrap', transition:'all .15s'
          }}>{t.label}</button>
        ))}
      </div>
      <div className="page">
        {tab==='athletes' && <Athletes />}
        {tab==='routines' && <Routines />}
        {tab==='agenda' && <CoachAgenda />}
        {tab==='metrics' && <CoachMetrics />}
        {tab==='import' && <CSVImporter />}
        {tab==='invitations' && <Invitations />}
      </div>
    </div>
  )
}
