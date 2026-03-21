import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['L','M','M','J','V','S','D']

function toISO(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function AthleteCalendar() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState(null)
  const [execution, setExecution] = useState({})
  const [rpe, setRpe] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', log_notes: '' })
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1 })()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*, routines(name, description, exercises_data)')
      .eq('athlete_id', user.id)
      .order('date', { ascending: false })
    setSessions(data || [])
  }

  function sessionsForDate(dateStr) {
    return sessions.filter(s => s.date === dateStr)
  }

  function openSession(session) {
    setSelectedSession(session)
    setRpe(null)
    setLogForm({ duration: '', log_notes: '' })
    setExecution({})
  }

  function getExData(session) {
    try { return session.routines?.exercises_data ? JSON.parse(session.routines.exercises_data) : null } catch { return null }
  }

  function updateExecution(exIdx, serieIdx, field, val) {
    setExecution(prev => ({ ...prev, [`${selectedSession.id}-${exIdx}-${serieIdx}-${field}`]: val }))
  }

  function getVal(exIdx, serieIdx, field) {
    return execution[`${selectedSession.id}-${exIdx}-${serieIdx}-${field}`] || ''
  }

  function calcMax(exIdx, series) {
    let max = 0
    series.forEach((_, si) => { const w = parseFloat(getVal(exIdx, si, 'weight')) || 0; if (w > max) max = w })
    return max || null
  }

  function calcVolume(exIdx, series) {
    let vol = 0
    series.forEach((_, si) => { vol += (parseFloat(getVal(exIdx, si, 'reps')) || 0) * (parseFloat(getVal(exIdx, si, 'weight')) || 0) })
    return vol || null
  }

  async function completeSession() {
    if (!selectedSession) return
    setSaving(true)
    await supabase.from('sessions').update({
      completed: true,
      rpe: rpe || '?',
      duration: logForm.duration,
      log_notes: logForm.log_notes,
      execution_data: JSON.stringify(execution)
    }).eq('id', selectedSession.id)
    setSaving(false)
    setSelectedSession(null)
    fetchSessions()
  }

  // If a session is selected, show it full screen
  if (selectedSession) {
    const exData = getExData(selectedSession)
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button className="btn sm" onClick={() => setSelectedSession(null)}>← Volver</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#f0f0f0' }}>{selectedSession.routines?.name}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{selectedSession.date}</div>
          </div>
          {selectedSession.completed
            ? <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>Completada</span>
            : <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>Pendiente</span>
          }
        </div>

        {selectedSession.notes && (
          <div style={{ background: 'rgba(74,222,128,0.06)', borderLeft: '3px solid #4ade80', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '13px', color: '#aaa', marginBottom: '14px' }}>
            {selectedSession.notes}
          </div>
        )}

        {exData ? exData.map((ex, exIdx) => (
          <div key={exIdx} style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '4px' }}>{ex.name}</div>
            {ex.note && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '6px' }}>{ex.note}</div>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111', borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', background: '#111' }}>Serie</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', background: '#111' }}>Reps plan</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', background: '#111' }}>Kg plan</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', background: '#111' }}>Reps real</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', background: '#111' }}>Kg real</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.series?.map((serie, si) => (
                    <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', color: '#4ade80', fontWeight: 700 }}>S{si + 1}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#aaa' }}>{serie.reps || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>{serie.weight ? `${serie.weight}kg` : '—'}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        {selectedSession.completed
                          ? <span style={{ color: '#60a5fa' }}>{getVal(exIdx, si, 'reps') || '—'}</span>
                          : <input type="number" value={getVal(exIdx, si, 'reps')} onChange={e => updateExecution(exIdx, si, 'reps', e.target.value)} style={{ width: '56px', padding: '5px', textAlign: 'center', marginBottom: 0, fontSize: '12px' }} placeholder="0" />
                        }
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        {selectedSession.completed
                          ? <span style={{ color: '#60a5fa' }}>{getVal(exIdx, si, 'weight') || '—'}</span>
                          : <input type="number" step="0.5" value={getVal(exIdx, si, 'weight')} onChange={e => updateExecution(exIdx, si, 'weight', e.target.value)} style={{ width: '64px', padding: '5px', textAlign: 'center', marginBottom: 0, fontSize: '12px' }} placeholder="0" />
                        }
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={3} style={{ padding: '6px 8px', fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Resultados</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '11px' }}>{calcMax(exIdx, ex.series || []) ? `Máx: ${calcMax(exIdx, ex.series || [])}kg` : '—'}</span>
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '11px' }}>{calcVolume(exIdx, ex.series || []) ? `Vol: ${calcVolume(exIdx, ex.series || [])}` : '—'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )) : selectedSession.routines?.description && (
          <div style={{ fontSize: '13px', color: '#aaa', whiteSpace: 'pre-line', background: '#111', padding: '12px', borderRadius: '10px', marginBottom: '14px', fontFamily: 'monospace', lineHeight: 1.8 }}>
            {selectedSession.routines.description}
          </div>
        )}

        {!selectedSession.completed && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f0f0', marginBottom: '10px' }}>Registrar sesión completada</div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Esfuerzo percibido (RPE)</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setRpe(n)} style={{ flex: 1, minWidth: '28px', padding: '8px 4px', border: `1px solid ${rpe===n?'#4ade80':'rgba(255,255,255,0.1)'}`, borderRadius: '8px', background: rpe===n?'rgba(74,222,128,0.12)':'#1a1a1a', color: rpe===n?'#4ade80':'#888', cursor: 'pointer', fontSize: '13px', fontWeight: rpe===n?700:400, fontFamily: 'inherit' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="field"><label>Duración (minutos)</label>
              <input type="number" value={logForm.duration} onChange={e => setLogForm({...logForm, duration: e.target.value})} placeholder="60" />
            </div>
            <div className="field"><label>Notas personales</label>
              <textarea rows={2} value={logForm.log_notes} onChange={e => setLogForm({...logForm, log_notes: e.target.value})} placeholder="Cómo te sentiste, qué lograste..." />
            </div>
            <button className="btn primary" style={{ width: '100%', padding: '12px' }} onClick={completeSession} disabled={saving}>
              {saving ? 'Guardando...' : 'Marcar como completada ✓'}
            </button>
          </div>
        )}

        {selectedSession.completed && (
          <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '12px 16px', marginTop: '8px' }}>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              RPE: <strong style={{ color: '#4ade80' }}>{selectedSession.rpe}</strong> · {selectedSession.duration} min
              {selectedSession.log_notes && <><br /><span style={{ fontStyle: 'italic' }}>"{selectedSession.log_notes}"</span></>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Calendar view
  const pendingSessions = sessions.filter(s => !s.completed && s.date >= today)
  const nextSession = pendingSessions.length > 0 ? pendingSessions[pendingSessions.length - 1] : null

  return (
    <div className="fade-in">
      {/* Next session banner */}
      {nextSession && (
        <div
          onClick={() => openSession(nextSession)}
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>
              {nextSession.date === today ? 'Sesión de hoy' : `Próxima sesión — ${nextSession.date}`}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f0' }}>{nextSession.routines?.name}</div>
          </div>
          <span style={{ color: '#4ade80', fontSize: '20px' }}>›</span>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button className="btn sm" onClick={() => setMonthDate(new Date(year, month - 1, 1))}>← Ant.</button>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{MONTHS[month]} {year}</span>
        <button className="btn sm" onClick={() => setMonthDate(new Date(year, month + 1, 1))}>Sig. →</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '4px' }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#555', paddingBottom: '4px' }}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '16px' }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDay + 1
          const valid = dayNum >= 1 && dayNum <= daysInMonth
          const dateStr = valid ? toISO(year, month, dayNum) : null
          const isToday = dateStr === today
          const ss = dateStr ? sessionsForDate(dateStr) : []
          const hasCompleted = ss.some(s => s.completed)
          const hasPending = ss.some(s => !s.completed)
          return (
            <div key={i}
              onClick={() => { if (!valid || !ss.length) return; openSession(ss[0]) }}
              style={{
                background: !valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.08)' : '#111',
                border: `1px solid ${!valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.4)' : ss.length ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '8px', padding: '5px 3px', minHeight: '52px',
                cursor: valid && ss.length ? 'pointer' : 'default'
              }}
            >
              {valid && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '3px' }}>
                    {ss.slice(0, 2).map(s => (
                      <div key={s.id} style={{ fontSize: '9px', background: s.completed ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.12)', color: s.completed ? '#4ade80' : '#fbbf24', borderRadius: '3px', padding: '1px 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {s.routines?.name || 'Sesión'}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: '#888', marginBottom: '16px' }}>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(74,222,128,0.15)', marginRight: '4px' }}></span>Completada</span>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(251,191,36,0.12)', marginRight: '4px' }}></span>Pendiente</span>
      </div>

      {/* Upcoming sessions list */}
      {pendingSessions.length > 0 && (
        <>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Próximas sesiones</div>
          {pendingSessions.slice(0, 3).map(s => (
            <div key={s.id} onClick={() => openSession(s)}
              style={{ background: '#111', border: '1px solid rgba(251,191,36,0.15)', borderLeft: '3px solid #fbbf24', borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{s.routines?.name}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.date}</div>
              </div>
              <span style={{ color: '#fbbf24', fontSize: '18px' }}>›</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
