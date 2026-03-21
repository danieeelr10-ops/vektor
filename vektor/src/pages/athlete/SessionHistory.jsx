import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SessionHistory() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*, routines(name, exercises_data)')
      .eq('athlete_id', user.id)
      .eq('completed', true)
      .order('date', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  function getExData(s) {
    try { return s.routines?.exercises_data ? JSON.parse(s.routines.exercises_data) : null } catch { return null }
  }

  function getExecution(s) {
    try { return s.execution_data ? JSON.parse(s.execution_data) : null } catch { return null }
  }

  function getVal(execData, sessionId, exIdx, si, field) {
    if (!execData) return null
    return execData[`${sessionId}-${exIdx}-${si}-${field}`] || null
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Cargando...</div>

  if (!sessions.length) return (
    <div className="empty fade-in">
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏁</div>
      <div style={{ fontWeight: 700, marginBottom: '6px' }}>Sin sesiones completadas</div>
      <div style={{ fontSize: '13px' }}>Completa tu primera sesión desde el Calendario.</div>
    </div>
  )

  const totalMin = sessions.reduce((a, s) => a + (parseFloat(s.duration) || 0), 0)
  const avgRPE = (sessions.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / sessions.length).toFixed(1)

  return (
    <div className="fade-in">
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          ['Sesiones', sessions.length],
          ['RPE prom.', avgRPE],
          ['Min totales', Math.round(totalMin)],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{lbl}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', marginTop: '4px' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      {sessions.map(s => {
        const exData = getExData(s)
        const execData = getExecution(s)
        const isOpen = expanded === s.id

        return (
          <div key={s.id} style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
            {/* Header row */}
            <div
              onClick={() => setExpanded(isOpen ? null : s.id)}
              style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#000', flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{s.routines?.name || 'Sesión'}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {s.date}
                    {s.rpe && ` · RPE ${s.rpe}`}
                    {s.duration && ` · ${s.duration} min`}
                  </div>
                </div>
              </div>
              <span style={{ color: '#555', fontSize: '16px', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
                {s.log_notes && (
                  <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', marginBottom: '12px', background: '#1a1a1a', padding: '8px 12px', borderRadius: '8px' }}>
                    "{s.log_notes}"
                  </div>
                )}

                {exData && exData.map((ex, exIdx) => {
                  if (!ex.series?.length) return null
                  return (
                    <div key={exIdx} style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0f0f0', marginBottom: '6px' }}>{ex.name}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {ex.series.map((serie, si) => {
                          const realReps = getVal(execData, s.id, exIdx, si, 'reps')
                          const realWeight = getVal(execData, s.id, exIdx, si, 'weight')
                          const hasReal = realReps || realWeight
                          return (
                            <div key={si} style={{ background: '#1a1a1a', border: `1px solid ${hasReal ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '6px 10px', minWidth: '70px' }}>
                              <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, marginBottom: '3px' }}>S{si + 1}</div>
                              {hasReal ? (
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>
                                  {realReps && <span>{realReps} rep{realReps > 1 ? 's' : ''}</span>}
                                  {realWeight && <span> × {realWeight}kg</span>}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: '#555' }}>
                                  {serie.reps || '?'} × {serie.weight || '?'}kg
                                  <div style={{ fontSize: '9px', color: '#444', marginTop: '1px' }}>planificado</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {!exData && s.routines?.description && (
                  <div style={{ fontSize: '12px', color: '#aaa', whiteSpace: 'pre-line', background: '#1a1a1a', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', lineHeight: 1.8 }}>
                    {s.routines.description}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
