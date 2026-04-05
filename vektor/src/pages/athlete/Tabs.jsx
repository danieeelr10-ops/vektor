import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import MetricsChart from '../../components/MetricsChart'
import { registerPush, unregisterPush, isPushSupported, isPushSubscribed } from '../../utils/push'

export function Today() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [showLog, setShowLog] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', log_notes: '' })
  const [execution, setExecution] = useState({})
  const [showSummary, setShowSummary] = useState(null)

  useEffect(() => { fetchToday() }, [])

  async function fetchToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('sessions').select('*, routines(name,description,exercises_data)').eq('athlete_id', user.id).eq('date', today)
    setSessions(data || [])
    const saved = {}
    for (const s of (data || [])) {
      if (s.execution_data) {
        try { Object.assign(saved, JSON.parse(s.execution_data)) } catch {}
      }
    }
    if (Object.keys(saved).length) setExecution(saved)
  }

  function getExData(s) {
    try { const r = s.routines?.exercises_data; return r ? (typeof r === 'string' ? JSON.parse(r) : r) : null } catch { return null }
  }

  function updateExecution(sessionId, exIdx, serieIdx, field, val) {
    setExecution(prev => ({ ...prev, [`${sessionId}-${exIdx}-${serieIdx}-${field}`]: val }))
  }

  function getVal(sessionId, exIdx, serieIdx, field) {
    return execution[`${sessionId}-${exIdx}-${serieIdx}-${field}`] || ''
  }

  function isDone(sessionId, exIdx, si) {
    return !!execution[`${sessionId}-${exIdx}-${si}-done`]
  }

  async function checkSet(sessionId, exIdx, si) {
    const updated = { ...execution, [`${sessionId}-${exIdx}-${si}-done`]: true }
    setExecution(updated)
    const sessionExec = Object.fromEntries(Object.entries(updated).filter(([k]) => k.startsWith(sessionId)))
    await supabase.from('sessions').update({ execution_data: JSON.stringify(sessionExec) }).eq('id', sessionId)
  }

  function calcMax(sessionId, exIdx, series) {
    let max = 0
    series.forEach((_, si) => {
      const w = parseFloat(getVal(sessionId, exIdx, si, 'weight')) || 0
      if (w > max) max = w
    })
    return max || '—'
  }

  function calcVolume(sessionId, exIdx, series) {
    let vol = 0
    series.forEach((_, si) => {
      const r = parseFloat(getVal(sessionId, exIdx, si, 'reps')) || 0
      const w = parseFloat(getVal(sessionId, exIdx, si, 'weight')) || 0
      vol += r * w
    })
    return vol || '—'
  }

  async function completeSession() {
    const completedSession = sessions.find(s => s.id === showLog)
    const sessionExec = Object.fromEntries(Object.entries(execution).filter(([k]) => k.startsWith(showLog)))
    await supabase.from('sessions').update({
      completed: true, rpe: rpe || '?', duration: logForm.duration,
      log_notes: logForm.log_notes, execution_data: JSON.stringify(sessionExec)
    }).eq('id', showLog)
    setShowSummary({ session: completedSession, rpe: rpe || '?', duration: logForm.duration, notes: logForm.log_notes })
    setShowLog(null); setRpe(null); setLogForm({ duration: '', log_notes: '' })
    fetchToday()
  }

  if (!sessions.length) return (
    <div className="fade-in">
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Sin sesión para hoy</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Tu entrenador asignará tu próxima sesión pronto.</div>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="stitle" style={{ marginBottom: '12px' }}>Sesión de hoy</div>
      {sessions.map(s => {
        const exData = getExData(s)
        const isCompleted = s.completed
        return (
          <div className="card green-border" key={s.id} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>{s.routines?.name}</div>
              {isCompleted ? <span className="badge green">Completada</span> : <span className="badge amber">Pendiente</span>}
            </div>
            {s.notes && <div style={{ background: 'var(--green-dim)', borderLeft: '3px solid var(--green)', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>{s.notes}</div>}

            {exData ? (
              <div style={{ marginBottom: '12px' }}>
                {exData.map((ex, exIdx) => (
                  <div key={exIdx} style={{ marginBottom: '14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'var(--text)' }}>{ex.name}</div>
                    {ex.note && <div style={{ fontSize: '11px', color: 'var(--text2)', fontStyle: 'italic', marginBottom: '6px' }}>{ex.note}</div>}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '300px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '9px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: 'var(--bg3)' }}>Serie</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '9px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', background: 'var(--bg3)' }}>Reps plan</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '9px', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', background: 'var(--bg3)' }}>Kg plan</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '9px', color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', background: 'var(--bg3)' }}>Reps real</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '9px', color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', background: 'var(--bg3)' }}>Kg real</th>
                            {!isCompleted && <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '9px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', background: 'var(--bg3)' }}>✓</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {ex.series.map((serie, si) => {
                            const done = isDone(s.id, exIdx, si)
                            return (
                              <tr key={si} style={{ borderBottom: '1px solid var(--border)', background: done ? 'rgba(74,222,128,0.04)' : 'transparent', transition: 'background .2s' }}>
                                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--green)', fontSize: '13px' }}>S{si+1}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: 'var(--text2)' }}>{serie.reps||'—'}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: 'var(--green)', fontWeight: 700 }}>{serie.weight ? `${serie.weight}kg` : '—'}</td>
                                <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                  {isCompleted
                                    ? <span style={{ color: 'var(--text)' }}>{getVal(s.id, exIdx, si, 'reps')||'—'}</span>
                                    : <input type="number" value={getVal(s.id, exIdx, si, 'reps')} onChange={e=>updateExecution(s.id,exIdx,si,'reps',e.target.value)} style={{ width: '52px', padding: '4px 6px', textAlign: 'center', marginBottom: 0, fontSize: '12px' }} placeholder="0" />
                                  }
                                </td>
                                <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                  {isCompleted
                                    ? <span style={{ color: 'var(--text)' }}>{getVal(s.id, exIdx, si, 'weight')||'—'}</span>
                                    : <input type="number" step="0.5" value={getVal(s.id, exIdx, si, 'weight')} onChange={e=>updateExecution(s.id,exIdx,si,'weight',e.target.value)} style={{ width: '60px', padding: '4px 6px', textAlign: 'center', marginBottom: 0, fontSize: '12px' }} placeholder="0" />
                                  }
                                </td>
                                {!isCompleted && (
                                  <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                    {done
                                      ? <span style={{ color: 'var(--green)', fontSize: '16px', fontWeight: 700 }}>✓</span>
                                      : <button onClick={() => checkSet(s.id, exIdx, si)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', color: 'var(--text3)', fontFamily: 'var(--font)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                                    }
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                          <tr style={{ background: 'var(--bg3)' }}>
                            <td colSpan={3} style={{ padding: '6px 8px', fontSize: '10px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Resultados</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Máx: {calcMax(s.id, exIdx, ex.series)}{typeof calcMax(s.id,exIdx,ex.series)==='number'?'kg':''}</span>
                            </td>
                            <td colSpan={isCompleted ? 1 : 2} style={{ textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>Vol: {calcVolume(s.id, exIdx, ex.series)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : s.routines?.description && (
              <div style={{ fontSize: '13px', color: 'var(--text2)', whiteSpace: 'pre-line', background: 'var(--bg3)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>{s.routines.description}</div>
            )}

            {!isCompleted && <button className="btn primary" style={{ width: '100%', padding: '12px' }} onClick={() => setShowLog(s.id)}>Registrar sesión completada</button>}
            {isCompleted && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>RPE: <strong style={{ color: 'var(--green)' }}>{s.rpe}</strong> · Duración: <strong style={{ color: 'var(--green)' }}>{s.duration} min</strong>{s.log_notes && <><br /><span style={{ fontStyle: 'italic' }}>"{s.log_notes}"</span></>}</div>}
          </div>
        )
      })}

      {/* Complete session modal */}
      {showLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLog(null)}>
          <div className="modal">
            <h3>Completar sesión</h3>
            <div className="field">
              <label>Esfuerzo percibido (RPE 1-10)</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setRpe(n)} style={{ flex: 1, minWidth: '30px', padding: '8px 4px', border: `1px solid ${rpe===n?'var(--green)':'var(--border)'}`, borderRadius: '8px', background: rpe===n?'var(--green-dim)':'var(--bg3)', color: rpe===n?'var(--green)':'var(--text2)', cursor: 'pointer', fontSize: '13px', fontWeight: rpe===n?700:400, fontFamily: 'var(--font)', transition: 'all .15s' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="field"><label>Duración (minutos)</label><input type="number" value={logForm.duration} onChange={e => setLogForm({ ...logForm, duration: e.target.value })} placeholder="60" /></div>
            <div className="field"><label>Notas personales</label><textarea rows={2} value={logForm.log_notes} onChange={e => setLogForm({ ...logForm, log_notes: e.target.value })} placeholder="Cómo te sentiste..." /></div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowLog(null)}>Cancelar</button>
              <button className="btn primary" onClick={completeSession}>Completar</button>
            </div>
          </div>
        </div>
      )}

      {/* Session summary modal */}
      {showSummary && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <h3>Sesión completada</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--green)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>RPE {showSummary.rpe}</span>
              {showSummary.duration && <span style={{ background: 'rgba(96,165,250,0.12)', color: 'var(--blue)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{showSummary.duration} min</span>}
            </div>
            {getExData(showSummary.session)?.map((ex, exIdx) => {
              const sid = showSummary.session.id
              return (
                <div key={exIdx} style={{ marginBottom: '10px', background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{ex.name}</div>
                  {ex.series.map((_, si) => {
                    const r = getVal(sid, exIdx, si, 'reps') || '—'
                    const w = getVal(sid, exIdx, si, 'weight') || '—'
                    return (
                      <div key={si} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text2)', padding: '2px 0' }}>
                        <span style={{ color: 'var(--green)', fontWeight: 700, minWidth: '22px' }}>S{si+1}</span>
                        <span>{r} reps × {w} kg</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Máx: {calcMax(sid, exIdx, ex.series)}{typeof calcMax(sid, exIdx, ex.series) === 'number' ? 'kg' : ''}</span>
                    <span style={{ color: 'var(--blue)', fontWeight: 700 }}>Vol: {calcVolume(sid, exIdx, ex.series)}</span>
                  </div>
                </div>
              )
            })}
            {showSummary.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', fontStyle: 'italic', marginBottom: '12px' }}>"{showSummary.notes}"</div>}
            <button className="btn primary" style={{ width: '100%' }} onClick={() => setShowSummary(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  useEffect(() => {
    supabase.from('sessions').select('*, routines(name)').eq('athlete_id', user.id).eq('completed', true).order('date', { ascending: false }).then(({ data }) => setSessions(data || []))
  }, [])
  if (!sessions.length) return <div className="empty fade-in">Sin sesiones completadas aún.</div>
  return (
    <div className="fade-in">
      {sessions.map(s => (
        <div className="card" key={s.id} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{s.routines?.name || 'Sesión'}</span>
            <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{s.date}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text2)' }}>RPE <strong style={{ color: 'var(--green)' }}>{s.rpe}</strong> · {s.duration} min{s.log_notes && <span style={{ fontStyle: 'italic' }}> · "{s.log_notes}"</span>}</div>
        </div>
      ))}
    </div>
  )
}

export function Metrics() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState([])

  useEffect(() => { fetchMetrics() }, [])

  async function fetchMetrics() {
    const { data } = await supabase.from('metrics').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setMetrics(data || [])
  }


  return (
    <div className="fade-in">
      {metrics.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize:'32px', marginBottom:'10px' }}>📊</div>
          <div style={{ fontWeight:700, marginBottom:'6px' }}>Sin medidas registradas</div>
          <div style={{ fontSize:'13px' }}>Tu entrenador registrará tus medidas en cada sesión de seguimiento.</div>
        </div>
      ) : (
        <>
          {metrics.length >= 2 && (
            <div className="card" style={{ marginBottom:'14px' }}>
              <MetricsChart metrics={metrics} />
            </div>
          )}
          {metrics[0]?.ai_analysis && (
            <div style={{ marginBottom:'14px', padding:'14px', background:'var(--green-dim)', border:'1px solid var(--border2)', borderRadius:'10px' }}>
              <div style={{ fontSize:'9px', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Análisis</div>
              <p style={{ fontSize:'13px', color:'var(--text)', lineHeight:1.7, margin:0 }}>{metrics[0].ai_analysis}</p>
            </div>
          )}
          {metrics.map((m, mIdx) => {
        const compRows = [
          ['Peso',                     m.weight,       'kg'],
          ['Agua corporal',            m.water_l,      'L'],
          ['Masa grasa corporal',      m.fat_kg,       'kg'],
          ['Masa corporal magra',      m.lean_mass_kg, 'kg'],
          ['Masa libre de grasa',      m.fat_free_kg,  'kg'],
          ['MME muscular esquelética', m.muscle_kg,    'kg'],
          ['IMC',                      m.imc,          'kg/m²'],
          ['PGC — % Grasa corporal',   m.body_fat,     '%'],
        ]
        const circRows = [['Brazo der.',m.arm_r],['Brazo izq.',m.arm_l],['Pierna der.',m.leg_r],['Pierna izq.',m.leg_l],['Cintura',m.waist]]
        return (
          <div className="card" key={m.id} style={{ marginBottom:'10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
              <div>
                <div style={{ fontSize:'12px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{m.date}</div>
                {m.goal && <div style={{ fontSize:'11px', color:'var(--green)', fontWeight:600, marginTop:'2px' }}>{m.goal}</div>}
              </div>
              {m.pdf_url && (
                <a href={m.pdf_url} target="_blank" rel="noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'7px', padding:'5px 10px', fontSize:'11px', color:'var(--green)', textDecoration:'none', fontWeight:700 }}>
                  📄 PDF
                </a>
              )}
            </div>
            <div className="stitle" style={{ marginBottom:'6px' }}>Composición corporal</div>
            <div style={{ borderRadius:'8px', overflow:'hidden', marginBottom:'12px' }}>
              {compRows.filter(([,v]) => v != null).map(([lbl, val, unit], i) => (
                <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background: i%2===0?'var(--bg3)':'var(--bg2)', fontSize:'12px' }}>
                  <span style={{ color:'var(--text2)' }}>{lbl}</span>
                  <span style={{ color:'var(--green)', fontWeight:700, fontFamily:'var(--mono)' }}>{val} <span style={{ fontSize:'10px', color:'var(--text3)' }}>{unit}</span></span>
                </div>
              ))}
            </div>
            {circRows.some(([,v]) => v) && (
              <>
                <div className="stitle" style={{ marginBottom:'6px' }}>Circunferencias</div>
                <div style={{ borderRadius:'8px', overflow:'hidden' }}>
                  {circRows.filter(([,v]) => v).map(([lbl, val], i) => (
                    <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background: i%2===0?'var(--bg3)':'var(--bg2)', fontSize:'12px' }}>
                      <span style={{ color:'var(--text2)' }}>{lbl}</span>
                      <span style={{ color:'var(--green)', fontWeight:700, fontFamily:'var(--mono)' }}>{val} <span style={{ fontSize:'10px', color:'var(--text3)' }}>cm</span></span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {m.note && <div style={{ fontSize:'12px', color:'var(--text2)', fontStyle:'italic', marginTop:'10px' }}>"{m.note}"</div>}
          </div>
        )
      })}
        </>
      )}
    </div>
  )
}


export function RMMaximo() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [exercises, setExercises] = useState([])
  const [form, setForm] = useState({ exercise:'', weight:'', reps:'1', note:'' })
  const [suggestions, setSuggestions] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRM(); fetchExercises() }, [])

  async function fetchExercises() {
    const { data } = await supabase.from('exercises').select('name,category').order('name')
    setExercises(data || [])
  }

  async function fetchRM() {
    const { data } = await supabase.from('rm_records').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setRecords(data || [])
  }

  function handleExerciseInput(val) {
    setForm({ ...form, exercise: val })
    if (val.length < 2) { setSuggestions([]); return }
    setSuggestions(exercises.filter(e => e.name.toLowerCase().includes(val.toLowerCase())).slice(0,6))
  }

  async function saveRM() {
    if (!form.exercise || !form.weight) return
    setSaving(true)
    await supabase.from('rm_records').insert({ ...form, user_id: user.id, date: new Date().toISOString().split('T')[0] })
    setForm({ exercise:'', weight:'', reps:'1', note:'' }); setSuggestions([]); setSaving(false); fetchRM()
  }

  const grouped = records.reduce((acc, r) => { if (!acc[r.exercise]) acc[r.exercise]=[]; acc[r.exercise].push(r); return acc }, {})

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom:'14px' }}>
        <div className="stitle" style={{ marginBottom:'12px' }}>Registrar nuevo RM</div>
        <div className="field" style={{ position:'relative' }}>
          <label>Ejercicio</label>
          <input value={form.exercise} onChange={e=>handleExerciseInput(e.target.value)} placeholder="Buscar ejercicio..." />
          {suggestions.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', zIndex:50, overflow:'hidden' }}>
              {suggestions.map(s => (
                <div key={s.name} onClick={() => { setForm({...form, exercise:s.name}); setSuggestions([]) }}
                  style={{ padding:'8px 12px', cursor:'pointer', fontSize:'13px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                  <span>{s.name}</span>
                  <span style={{ fontSize:'11px', color:'var(--text3)' }}>{s.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="g2">
          <div className="field"><label>Peso (kg)</label><input type="number" step="0.5" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} placeholder="80" /></div>
          <div className="field"><label>Repeticiones</label><input type="number" value={form.reps} onChange={e=>setForm({...form,reps:e.target.value})} placeholder="1" /></div>
        </div>
        <div className="field"><label>Nota (opcional)</label><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Condiciones, equipo..." /></div>
        <button className="btn primary" style={{ width:'100%' }} onClick={saveRM} disabled={saving}>{saving?'Guardando...':'Guardar RM'}</button>
      </div>
      {Object.keys(grouped).length === 0 && <div className="empty">Sin registros de RM aún.</div>}
      {Object.entries(grouped).map(([exercise, recs]) => {
        const best = recs.reduce((a,b) => parseFloat(a.weight)>parseFloat(b.weight)?a:b)
        return (
          <div className="card" key={exercise} style={{ marginBottom:'10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
              <div style={{ fontWeight:700, fontSize:'14px' }}>{exercise}</div>
              <span className="badge green">Mejor: {best.weight} kg × {best.reps}</span>
            </div>
            {recs.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'12px' }}>
                <span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>{r.date}</span>
                <span style={{ fontWeight:700, color: r.id===best.id?'var(--green)':'var(--text)' }}>{r.weight} kg × {r.reps} rep{r.reps>1?'s':''}</span>
                {r.note && <span style={{ color:'var(--text3)', fontStyle:'italic', fontSize:'11px' }}>{r.note}</span>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function generateFeedback(metrics, sessions) {
  if (metrics.length < 2) return null
  const first = metrics[metrics.length-1], last = metrics[0]
  const goal = last.goal || 'Ganar músculo'
  const dw = (parseFloat(last.weight)-parseFloat(first.weight)).toFixed(1)
  const dfat = (parseFloat(last.body_fat)-parseFloat(first.body_fat)).toFixed(1)
  const dmusc = (parseFloat(last.muscle_pct)-parseFloat(first.muscle_pct)).toFixed(1)
  const darm = last.arm_r&&first.arm_r ? (parseFloat(last.arm_r)-parseFloat(first.arm_r)).toFixed(1) : null
  const dwaist = last.waist&&first.waist ? (parseFloat(last.waist)-parseFloat(first.waist)).toFixed(1) : null
  const lines = []
  if (goal==='Ganar músculo') {
    if (parseFloat(dmusc)>0) lines.push(`Ganaste +${dmusc}% de músculo — excelente progreso de hipertrofia.`)
    if (parseFloat(dfat)<0) lines.push(`Redujiste la grasa en ${dfat}% mientras ganabas músculo.`)
    if (darm&&parseFloat(darm)>0) lines.push(`Tu brazo derecho creció +${darm} cm — señal clara de desarrollo muscular.`)
    if (parseFloat(dmusc)<=0) lines.push('El músculo aún no muestra cambios — revisa la progresión de cargas y la ingesta de proteína.')
  } else if (goal==='Bajar peso / grasa') {
    if (parseFloat(dw)<0) lines.push(`Perdiste ${Math.abs(dw)} kg — vas en la dirección correcta.`)
    if (parseFloat(dfat)<0) lines.push(`La grasa bajó ${Math.abs(dfat)}% — el déficit calórico está funcionando.`)
    if (dwaist&&parseFloat(dwaist)<0) lines.push(`Tu cintura redujo ${Math.abs(dwaist)} cm — excelente indicador de pérdida abdominal.`)
  } else if (goal==='Mejorar resistencia') {
    if (sessions.length>=8) lines.push(`Completaste ${sessions.length} sesiones — tu consistencia es tu mayor fortaleza.`)
    lines.push('Prioriza sesiones de cardio progresivo y mantén el RPE entre 6 y 8.')
  } else {
    lines.push('Tu composición corporal evoluciona favorablemente para el rendimiento deportivo.')
    if (sessions.length>0) lines.push(`Con ${sessions.length} sesiones completadas, tu base física es sólida.`)
  }
  if (sessions.length>=8) lines.push('Tu constancia en el entrenamiento es clave — sigue así.')
  return { goal, lines }
}

export function Progress() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState([])
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase.from('metrics').select('*').eq('user_id', user.id).order('date', { ascending: false }).then(({ data }) => setMetrics(data||[]))
    supabase.from('sessions').select('*').eq('athlete_id', user.id).eq('completed', true).then(({ data }) => setSessions(data||[]))
  }, [])

  const totalMin = sessions.reduce((acc,s)=>acc+(parseFloat(s.duration)||0),0)
  const avgRPE = sessions.length ? (sessions.reduce((acc,s)=>acc+(parseFloat(s.rpe)||0),0)/sessions.length).toFixed(1) : '—'
  const feedback = generateFeedback(metrics, sessions)
  const chartData = [...metrics].reverse().map(m=>({ date:m.date.slice(5), peso:parseFloat(m.weight)||null, grasa:parseFloat(m.body_fat)||null, musculo:parseFloat(m.muscle_pct)||null }))
  const circData = [...metrics].reverse().map(m=>({ date:m.date.slice(5), arm_r:parseFloat(m.arm_r)||null, waist:parseFloat(m.waist)||null, leg_r:parseFloat(m.leg_r)||null }))
  const tooltipStyle = { background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'8px', fontSize:'12px' }

  return (
    <div className="fade-in">
      <div className="g3" style={{ marginBottom:'14px' }}>
        <div className="metric"><div className="lbl">Sesiones</div><div className="val">{sessions.length}</div></div>
        <div className="metric"><div className="lbl">RPE prom.</div><div className="val">{avgRPE}</div></div>
        <div className="metric"><div className="lbl">Min totales</div><div className="val">{Math.round(totalMin)}</div></div>
      </div>
      {feedback && (
        <div style={{ background:'var(--green-dim)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', padding:'14px', marginBottom:'14px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Retroalimentación · {feedback.goal}</div>
          {feedback.lines.map((line,i) => <div key={i} style={{ fontSize:'13px', color:'var(--text)', lineHeight:1.7, marginBottom: i<feedback.lines.length-1?'4px':0 }}>{line}</div>)}
        </div>
      )}
      {chartData.length>=2 ? <>
        <div className="card" style={{ marginBottom:'12px' }}>
          <div className="stitle" style={{ marginBottom:'12px' }}>Peso y composición corporal</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill:'var(--text3)', fontSize:10 }} />
              <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} domain={['auto','auto']} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="peso" stroke="var(--green)" strokeWidth={2} dot={false} name="Peso kg" />
              <Line type="monotone" dataKey="grasa" stroke="var(--amber)" strokeWidth={2} dot={false} name="Grasa %" />
              <Line type="monotone" dataKey="musculo" stroke="var(--blue)" strokeWidth={2} dot={false} name="Músculo %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {circData.some(d=>d.arm_r||d.waist||d.leg_r) && (
          <div className="card">
            <div className="stitle" style={{ marginBottom:'12px' }}>Circunferencias (cm)</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={circData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text3)', fontSize:10 }} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} domain={['auto','auto']} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="arm_r" stroke="var(--green)" strokeWidth={2} dot={false} name="Brazo der." />
                <Line type="monotone" dataKey="waist" stroke="var(--amber)" strokeWidth={2} dot={false} name="Cintura" />
                <Line type="monotone" dataKey="leg_r" stroke="var(--blue)" strokeWidth={2} dot={false} name="Pierna der." />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </> : <div className="empty">Registra al menos 2 mediciones para ver tus gráficas.</div>}
    </div>
  )
}

export function Notifications() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setSupported(isPushSupported())
    isPushSubscribed().then(setSubscribed)
  }, [])

  async function toggle() {
    setLoading(true)
    setStatus('')
    try {
      if (subscribed) {
        await unregisterPush(user.id, supabase)
        setSubscribed(false)
        setStatus('Notificaciones desactivadas.')
      } else {
        const ok = await registerPush(user.id, supabase)
        if (ok) {
          setSubscribed(true)
          setStatus('Notificaciones activadas.')
        } else {
          setStatus('No se pudo activar. Verifica los permisos del navegador.')
        }
      }
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="stitle" style={{ marginBottom: '12px' }}>Notificaciones push</div>
        {!supported ? (
          <div className="empty">Tu navegador no soporta notificaciones push.</div>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: 1.6 }}>
              Recibe notificaciones cuando tu coach te asigne una sesión u otro evento importante.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', borderRadius: '10px', padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)' }}>
                  {subscribed ? 'Notificaciones activas' : 'Notificaciones inactivas'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                  {subscribed ? 'Recibirás alertas de sesiones y mensajes' : 'Actívalas para no perderte nada'}
                </div>
              </div>
              <button
                onClick={toggle}
                disabled={loading}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'wait' : 'pointer',
                  fontWeight: 700, fontSize: '12px', fontFamily: 'inherit',
                  background: subscribed ? 'rgba(248,113,113,0.15)' : 'var(--green)',
                  color: subscribed ? '#f87171' : '#000',
                  transition: 'all .15s',
                }}
              >
                {loading ? '...' : subscribed ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            {status && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>{status}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
