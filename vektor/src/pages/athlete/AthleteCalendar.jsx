import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['L','M','M','J','V','S','D']

function toISO(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function AthleteCalendar() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [payments, setPayments] = useState([])
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState(null)
  const [showDayModal, setShowDayModal] = useState(null)
  const [execution, setExecution] = useState({})
  const [rpe, setRpe] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', log_notes: '' })
  const [saving, setSaving] = useState(false)

  const isPresencial = profile?.mode === 'presencial'
  const today = new Date().toISOString().split('T')[0]
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1 })()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name, description, exercises_data)').eq('athlete_id', user.id).order('date', { ascending: false }),
      supabase.from('payments').select('*').eq('athlete_id', user.id).order('date', { ascending: false })
    ])
    setSessions(s || [])
    setPayments(p || [])
  }

  const lastPayment = payments[0]
  const sessionsRemaining = lastPayment ? (lastPayment.sessions_purchased - lastPayment.sessions_used) : 0

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
    const payload = {
      completed: true,
      rpe: rpe ? String(rpe) : '?',
      duration: logForm.duration || null,
      log_notes: logForm.log_notes || null,
      execution_data: JSON.stringify(execution)
    }
    const { error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', selectedSession.id)
      .eq('athlete_id', user.id)
    if (error) {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setSelectedSession(null)
    await fetchAll()
  }

  // SESSION DETAIL VIEW (online - full execution)
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

  // PRESENCIAL READ-ONLY DAY MODAL
  const daySession = showDayModal ? sessionsForDate(showDayModal)[0] : null

  const pendingSessions = sessions.filter(s => !s.completed && s.date >= today)
  const nextSession = pendingSessions.length > 0 ? pendingSessions[pendingSessions.length - 1] : null

  return (
    <div className="fade-in">

      {/* Package counter for presencial */}
      {isPresencial && lastPayment && (
        <div style={{ background: '#111', border: `1px solid ${sessionsRemaining <= 2 ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>Sesiones disponibles</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: sessionsRemaining <= 2 ? '#f87171' : '#4ade80', fontFamily: 'monospace' }}>
              {sessionsRemaining} <span style={{ fontSize: '11px', color: '#555' }}>/ {lastPayment.sessions_purchased}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: lastPayment.sessions_purchased }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: '5px', borderRadius: '3px', background: i < lastPayment.sessions_used ? 'rgba(255,255,255,0.07)' : sessionsRemaining <= 2 ? '#f87171' : '#4ade80' }} />
            ))}
          </div>
          {sessionsRemaining <= 2 && (
            <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>Quedan pocas sesiones — habla con tu entrenador para renovar.</div>
          )}
        </div>
      )}

      {/* Next session banner (online only) */}
      {!isPresencial && nextSession && (
        <div onClick={() => openSession(nextSession)}
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>
              {nextSession.date === today ? 'Sesión de hoy' : `Próxima sesión — ${nextSession.date}`}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f0' }}>{nextSession.routines?.name}</div>
          </div>
          <span style={{ color: '#4ade80', fontSize: '20px' }}>›</span>
        </div>
      )}

      {/* Presencial: next session banner (read-only) */}
      {isPresencial && nextSession && (
        <div onClick={() => setShowDayModal(nextSession.date)}
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>
              {nextSession.date === today ? 'Sesión de hoy' : `Próxima sesión — ${nextSession.date}`}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f0' }}>{nextSession.notes || 'Ver detalle →'}</div>
          </div>
          <span style={{ color: '#a78bfa', fontSize: '20px' }}>›</span>
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
              onClick={() => {
                if (!valid || !ss.length) return
                if (isPresencial) setShowDayModal(dateStr)
                else openSession(ss[0])
              }}
              style={{
                background: !valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.08)' : isToday ? 'rgba(74,222,128,0.04)' : '#111',
                border: `1px solid ${!valid ? 'transparent' : hasCompleted ? 'rgba(74,222,128,0.35)' : hasPending ? 'rgba(167,139,250,0.25)' : isToday ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '8px', padding: '5px 3px', minHeight: '52px',
                cursor: valid && ss.length ? 'pointer' : 'default'
              }}
            >
              {valid && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                  {hasCompleted && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>✓</div>
                    </div>
                  )}
                  {!hasCompleted && hasPending && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: isPresencial ? 'rgba(167,139,250,0.15)' : 'rgba(251,191,36,0.12)', border: `1px solid ${isPresencial ? 'rgba(167,139,250,0.4)' : 'rgba(251,191,36,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: isPresencial ? '#a78bfa' : '#fbbf24' }}>•</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: '#888', marginBottom: '16px' }}>
        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#4ade80', marginRight: '4px', verticalAlign: 'middle', fontSize: '8px', fontWeight: 700, color: '#000', textAlign: 'center', lineHeight: '12px' }}>✓</span>Completada</span>
        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: isPresencial ? 'rgba(167,139,250,0.15)' : 'rgba(251,191,36,0.12)', marginRight: '4px', verticalAlign: 'middle' }}></span>Pendiente</span>
      </div>

      {/* Online: upcoming list */}
      {!isPresencial && pendingSessions.length > 0 && (
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

      {/* Presencial: upcoming list (read-only) */}
      {isPresencial && pendingSessions.length > 0 && (
        <>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Próximas sesiones</div>
          {pendingSessions.slice(0, 3).map(s => (
            <div key={s.id} onClick={() => setShowDayModal(s.date)}
              style={{ background: '#111', border: '1px solid rgba(167,139,250,0.15)', borderLeft: '3px solid #a78bfa', borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{s.date}</div>
                {s.notes && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{s.notes}</div>}
              </div>
              <span style={{ color: '#a78bfa', fontSize: '18px' }}>›</span>
            </div>
          ))}
        </>
      )}

      {/* PRESENCIAL: Read-only day modal */}
      {showDayModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowDayModal(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}>Sesión — {showDayModal}</h3>
              <button className="btn sm" onClick={() => setShowDayModal(null)}>✕</button>
            </div>
            {sessionsForDate(showDayModal).map(s => (
              <div key={s.id}>
                {s.completed && (
                  <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#000' }}>✓</div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>Sesión completada</span>
                  </div>
                )}
                {s.notes && (
                  <div style={{ background: '#1a1a1a', borderLeft: '3px solid #a78bfa', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>Indicaciones del entrenador</div>
                    <div style={{ fontSize: '13px', color: '#f0f0f0', lineHeight: 1.6 }}>{s.notes}</div>
                  </div>
                )}
                {!s.notes && !s.completed && (
                  <div style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>El entrenador aún no ha añadido indicaciones para este día.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
