import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'VTK-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Invitations() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: inv }, { data: pend }] = await Promise.all([
      supabase.from('invitations').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('coach_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
    ])
    setInvitations(inv || [])
    setPending(pend || [])
    setLoading(false)
  }

  async function generateInvite() {
    setGenerating(true)
    let code = generateCode()
    // Ensure unique
    const { data: existing } = await supabase.from('invitations').select('id').eq('code', code)
    if (existing?.length) code = generateCode() + Math.floor(Math.random()*9)
    await supabase.from('invitations').insert({ code, coach_id: user.id, used: false })
    setGenerating(false)
    fetchAll()
  }

  async function deleteInvite(id) {
    await supabase.from('invitations').delete().eq('id', id)
    fetchAll()
  }

  async function approveAthlete(athleteId) {
    await supabase.from('profiles').update({ status: 'active' }).eq('id', athleteId)
    fetchAll()
  }

  async function rejectAthlete(athleteId) {
    if (!confirm('¿Rechazar y eliminar este atleta?')) return
    await supabase.from('profiles').delete().eq('id', athleteId)
    fetchAll()
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Cargando...</div>

  return (
    <div className="fade-in">

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            {pending.length} atleta{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''} de aprobación
          </div>
          {pending.map(p => (
            <div key={p.id} style={{ background: '#111', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{p.email} · {p.sport}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn primary sm" onClick={() => approveAthlete(p.id)}>✓ Aprobar</button>
                <button className="btn danger sm" onClick={() => rejectAthlete(p.id)}>× Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate code */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Generar código de invitación</div>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6, marginBottom: '12px' }}>
          Cada código es de un solo uso. Compártelo con tu atleta para que pueda crear su cuenta.
        </div>
        <button className="btn primary" style={{ width: '100%' }} onClick={generateInvite} disabled={generating}>
          {generating ? 'Generando...' : '+ Generar nuevo código'}
        </button>
      </div>

      {/* Active codes */}
      {invitations.filter(i => !i.used).length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Códigos activos</div>
          {invitations.filter(i => !i.used).map(inv => (
            <div key={inv.id} style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', letterSpacing: '.1em' }}>{inv.code}</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{new Date(inv.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn sm" onClick={() => copyCode(inv.code)} style={{ color: copied === inv.code ? '#4ade80' : '#f0f0f0', minWidth: '70px' }}>
                  {copied === inv.code ? '✓ Copiado' : 'Copiar'}
                </button>
                <button className="btn danger sm" onClick={() => deleteInvite(inv.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Used codes */}
      {invitations.filter(i => i.used).length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Códigos utilizados</div>
          {invitations.filter(i => i.used).map(inv => (
            <div key={inv.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#555', fontFamily: 'monospace', letterSpacing: '.1em' }}>{inv.code}</div>
              <span style={{ fontSize: '10px', color: '#555', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '99px' }}>Usado</span>
            </div>
          ))}
        </div>
      )}

      {invitations.length === 0 && pending.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔑</div>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Sin invitaciones aún</div>
          <div style={{ fontSize: '13px' }}>Genera un código y compártelo con tu atleta.</div>
        </div>
      )}
    </div>
  )
}
