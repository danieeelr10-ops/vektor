import { useEffect, useState } from 'react'
import AthleteDashboard from './AthleteDashboard'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function toISO(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function AthleteProfile({ athlete, onBack }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [sessions, setSessions] = useState([])
  const [metrics, setMetrics] = useState([])
  const [rmRecords, setRmRecords] = useState([])
  const [routines, setRoutines] = useState([])
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ routine_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [athlete.id])

  async function fetchAll() {
    const [{ data: s }, { data: m }, { data: r }, { data: ro }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name,exercises_data)').eq('athlete_id', athlete.id).order('date', { ascending: false }),
      supabase.from('metrics').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('rm_records').select('*').eq('user_id', athlete.id).order('date', { ascending: false }),
      supabase.from('routines').select('id,name').eq('coach_id', user.id).order('name')
    ])
    setSessions(s || [])
    setMetrics(m || [])
    setRmRecords(r || [])
    setRoutines(ro || [])
    if (ro?.length) setAssignForm(f => ({ ...f, routine_id: ro[0].id }))
  }

  function sessionsByDate(dateStr) {
    return sessions.filter(s => s.date === dateStr)
  }

  async function assignSession() {
    if (!assignForm.routine_id || !selectedDate) return
    setSaving(true)
    await supabase.from('sessions').insert({
      coach_id: user.id,
      athlete_id: athlete.id,
      routine_id: assignForm.routine_id,
      date: selectedDate,
      notes: assignForm.notes,
      completed: false
    })
    setSaving(false)
    setShowAssign(false)
    setAssignForm(f => ({ ...f, notes: '' }))
    fetchAll()
  }

  async function deleteSession(id) {
    if (!confirm('¿Eliminar esta sesión?')) return
    await supabase.from('sessions').delete().eq('id', id)
    fetchAll()
  }

  // Calendar
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = (() => { const d = new Date(year,month,1).getDay(); return d===0?6:d-1 })()
  const totalCells = Math.ceil((firstDay+daysInMonth)/7)*7
  const today = new Date().toISOString().split('T')[0]

  // RM grouped
  const rmGrouped = rmRecords.reduce((acc, r) => {
    if (!acc[r.exercise]) acc[r.exercise] = []
    acc[r.exercise].push(r)
    return acc
  }, {})

  const TABS = [
    { id: 'calendar', label: 'Calendario' },
    { id: 'sessions', label: 'Sesiones' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'rm', label: 'RM' },
    { id: 'dashboard', label: 'Dashboard' },
  ]

  const statStyle = { background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }
  const statLbl = { fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }
  const statVal = { fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#4ade80', fontFamily: 'monospace' }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn sm" onClick={onBack}>← Volver</button>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4ade80', fontSize: '14px' }}>
          {athlete.name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{athlete.name}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{athlete.sport} · {athlete.email}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <div style={statStyle}><div style={statLbl}>Sesiones</div><div style={statVal}>{sessions.length}</div></div>
        <div style={statStyle}><div style={statLbl}>Completadas</div><div style={statVal}>{sessions.filter(s=>s.completed).length}</div></div>
        <div style={statStyle}><div style={statLbl}>Mediciones</div><div style={statVal}>{metrics.length}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px', border: tab===t.id ? '1px solid rgba(74,222,128,0.3)' : 'none',
            background: tab===t.id ? '#222' : 'transparent',
            color: tab===t.id ? '#4ade80' : '#888',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', borderRadius: '8px', transition: 'all .15s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month-1,1))}>← Anterior</button>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{MONTHS[month]} {year}</span>
            <button className="btn sm" onClick={() => setMonthDate(new Date(year,month+1,1))}>Siguiente →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#555', fontWeight: 700, paddingBottom: '4px' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDay + 1
              const valid = dayNum >= 1 && dayNum <= daysInMonth
              const dateStr = valid ? toISO(year, month, dayNum) : null
              const isToday = dateStr === today
              const ss = dateStr ? sessionsByDate(dateStr) : []
              return (
                <div key={i} onClick={() => { if (!valid) return; setSelectedDate(dateStr); setShowAssign(true) }}
                  style={{
                    background: !valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.08)' : '#111',
                    border: `1px solid ${!valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '8px', padding: '6px 4px', minHeight: '52px',
                    cursor: valid ? 'pointer' : 'default', transition: 'border-color .15s'
                  }}>
                  {valid && <>
                    <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                      {ss.map(s => <div key={s.id} style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.completed ? '#4ade80' : '#fbbf24' }} />)}
                    </div>
                  </>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '11px', color: '#888' }}>
            <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', marginRight: '4px' }}></span>Completada</span>
            <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', marginRight: '4px' }}></span>Pendiente</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#555', textAlign: 'center' }}>Haz clic en cualquier día para asignar una sesión</div>
        </div>
      )}

      {/* SESSIONS TAB */}
      {tab === 'sessions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>Sesiones asignadas</span>
            <button className="btn primary sm" onClick={() => { setSelectedDate(today); setShowAssign(true) }}>+ Sesión</button>
          </div>
          {sessions.length === 0 && <div className="empty">Sin sesiones asignadas.</div>}
          {sessions.map(s => {
            const execData = (() => { try { return s.execution_data ? JSON.parse(s.execution_data) : null } catch { return null } })()
            const routineExData = (() => { try { return s.routines?.exercises_data ? JSON.parse(s.routines.exercises_data) : null } catch { return null } })()
            return (
              <div key={s.id} style={{ background: '#111', border: `1px solid ${s.completed ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.routines?.name || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{s.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {s.completed
                      ? <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>Completada</span>
                      : <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>Pendiente</span>
                    }
                    {!s.completed && <button className="btn danger sm" onClick={() => deleteSession(s.id)}>×</button>}
                  </div>
                </div>

                {s.completed && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>RPE</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{s.rpe}</div>
                      </div>
                      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>Duración</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{s.duration}<span style={{ fontSize: '11px' }}> min</span></div>
                      </div>
                      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>Nota</div>
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', fontStyle: 'italic' }}>{s.log_notes || '—'}</div>
                      </div>
                    </div>

                    {routineExData && routineExData.map((ex, exIdx) => {
                      const nSeries = ex.series?.length || 0
                      if (!nSeries) return null
                      let maxWeight = 0, totalVol = 0
                      ex.series.forEach((_, si) => {
                        const rKey = `${s.id}-${exIdx}-${si}-reps`
                        const wKey = `${s.id}-${exIdx}-${si}-weight`
                        const execObj = execData || {}
                        const r = parseFloat(execObj[rKey]) || 0
                        const w = parseFloat(execObj[wKey]) || 0
                        if (w > maxWeight) maxWeight = w
                        totalVol += r * w
                      })
                      return (
                        <div key={exIdx} style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0f0f0', marginBottom: '6px' }}>{ex.name}</div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Serie</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Reps plan</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '9px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Kg plan</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Reps real</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Kg real</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ex.series.map((serie, si) => {
                                  const execObj = execData || {}
                                  const realReps = execObj[`${s.id}-${exIdx}-${si}-reps`] || '—'
                                  const realWeight = execObj[`${s.id}-${exIdx}-${si}-weight`] || '—'
                                  return (
                                    <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                      <td style={{ padding: '8px', color: '#4ade80', fontWeight: 700 }}>S{si+1}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: '#aaa' }}>{serie.reps||'—'}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>{serie.weight ? `${serie.weight}kg` : '—'}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: '#60a5fa', fontWeight: 600 }}>{realReps}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: '#60a5fa', fontWeight: 600 }}>{realWeight !== '—' ? `${realWeight}kg` : '—'}</td>
                                    </tr>
                                  )
                                })}
                                <tr style={{ background: '#222' }}>
                                  <td colSpan={3} style={{ padding: '6px 8px', fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Resultados</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '11px' }}>Máx: {maxWeight > 0 ? `${maxWeight}kg` : '—'}</span>
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '11px' }}>Vol: {totalVol > 0 ? totalVol : '—'}</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
                {s.notes && !s.completed && <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>📋 {s.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* METRICS TAB */}
      {tab === 'metrics' && (
        <div>
          {metrics.length === 0 && <div className="empty">Sin medidas registradas.</div>}
          {metrics.map(m => (
            <div key={m.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>{m.date}</span>
                {m.goal && <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>{m.goal}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                {[['Peso', m.weight, 'kg'], ['Grasa', m.body_fat, '%'], ['Músculo', m.muscle_pct, '%']].map(([lbl, val, unit]) => (
                  <div key={lbl} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{lbl}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80', marginTop: '4px', fontFamily: 'monospace' }}>{val}<span style={{ fontSize: '10px' }}>{unit}</span></div>
                  </div>
                ))}
              </div>
              {(m.arm_r || m.waist) && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em', marginBottom: '8px' }}>Circunferencias</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[['Brazo der. rel.',m.arm_r],['Brazo izq. rel.',m.arm_l],['Brazo der. flex.',m.arm_r_flex],['Brazo izq. flex.',m.arm_l_flex],['Pierna der.',m.leg_r],['Pierna izq.',m.leg_l]].filter(c=>c[1]).map(c => (
                      <div key={c[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ color: '#aaa' }}>{c[0]}</span>
                        <span style={{ color: '#4ade80', fontWeight: 700 }}>{c[1]} cm</span>
                      </div>
                    ))}
                  </div>
                  {m.waist && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 0' }}>
                    <span style={{ color: '#aaa' }}>Cintura</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{m.waist} cm</span>
                  </div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RM TAB */}
      {tab === 'rm' && (
        <div>
          {Object.keys(rmGrouped).length === 0 && <div className="empty">Sin registros de RM.</div>}
          {Object.entries(rmGrouped).map(([exercise, recs]) => {
            const best = recs.reduce((a, b) => parseFloat(a.weight) > parseFloat(b.weight) ? a : b)
            return (
              <div key={exercise} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{exercise}</div>
                  <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>Mejor: {best.weight} kg × {best.reps}</span>
                </div>
                {recs.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '12px' }}>
                    <span style={{ color: '#aaa', fontFamily: 'monospace' }}>{r.date}</span>
                    <span style={{ fontWeight: 700, color: r.id === best.id ? '#4ade80' : '#f0f0f0' }}>{r.weight} kg × {r.reps} rep{r.reps > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (
        <AthleteDashboard athlete={athlete} onBack={() => setTab('metrics')} />
      )}

      {/* ASSIGN MODAL */}
      {showAssign && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(false)}>
          <div className="modal">
            <h3>Asignar sesión — {selectedDate}</h3>
            <div className="field">
              <label>Rutina</label>
              <select value={assignForm.routine_id} onChange={e => setAssignForm({ ...assignForm, routine_id: e.target.value })}>
                {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Notas para el atleta</label>
              <textarea rows={2} value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Indicaciones especiales..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowAssign(false)}>Cancelar</button>
              <button className="btn primary" onClick={assignSession} disabled={saving}>{saving ? 'Guardando...' : 'Asignar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
