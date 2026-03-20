import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function Today() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [showLog, setShowLog] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', log_notes: '' })

  useEffect(() => { fetchToday() }, [])

  async function fetchToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('sessions').select('*, routines(name,description)').eq('athlete_id', user.id).eq('date', today)
    setSessions(data || [])
  }

  async function completeSession() {
    await supabase.from('sessions').update({ completed: true, rpe: rpe || '?', duration: logForm.duration, log_notes: logForm.log_notes }).eq('id', showLog)
    setShowLog(null); setRpe(null); setLogForm({ duration: '', log_notes: '' }); fetchToday()
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
      {sessions.map(s => (
        <div className="card green-border" key={s.id} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{s.routines?.name}</div>
            {s.completed ? <span className="badge green">Completada</span> : <span className="badge amber">Pendiente</span>}
          </div>
          {s.notes && <div style={{ background: 'var(--green-dim)', borderLeft: '3px solid var(--green)', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>{s.notes}</div>}
          {s.routines?.description && <div style={{ fontSize: '13px', color: 'var(--text2)', whiteSpace: 'pre-line', background: 'var(--bg3)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>{s.routines.description}</div>}
          {!s.completed && <button className="btn primary" style={{ width: '100%', padding: '12px' }} onClick={() => setShowLog(s.id)}>Marcar como completada</button>}
          {s.completed && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>RPE: <strong style={{ color: 'var(--green)' }}>{s.rpe}</strong> · Duración: <strong style={{ color: 'var(--green)' }}>{s.duration} min</strong>{s.log_notes && <><br /><span style={{ fontStyle: 'italic' }}>"{s.log_notes}"</span></>}</div>}
        </div>
      ))}
      {showLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLog(null)}>
          <div className="modal">
            <h3>Registrar sesión completada</h3>
            <div className="field">
              <label>Esfuerzo percibido (RPE 1-10)</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setRpe(n)} style={{ flex: 1, minWidth: '30px', padding: '8px 4px', border: `1px solid ${rpe===n?'var(--green)':'var(--border)'}`, borderRadius: '8px', background: rpe===n?'var(--green-dim)':'var(--bg3)', color: rpe===n?'var(--green)':'var(--text2)', cursor: 'pointer', fontSize: '13px', fontWeight: rpe===n?700:400, fontFamily: 'var(--font)', transition: 'all .15s' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="field"><label>Duración (minutos)</label><input type="number" value={logForm.duration} onChange={e => setLogForm({ ...logForm, duration: e.target.value })} placeholder="60" /></div>
            <div className="field"><label>Notas personales</label><textarea rows={3} value={logForm.log_notes} onChange={e => setLogForm({ ...logForm, log_notes: e.target.value })} placeholder="Cómo te sentiste, qué lograste..." /></div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowLog(null)}>Cancelar</button>
              <button className="btn primary" onClick={completeSession}>Completar</button>
            </div>
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
  const [tab, setTab] = useState('registro')
  const [form, setForm] = useState({ weight:'', body_fat:'', muscle_pct:'', water_pct:'', imc:'', body_age:'', arm_r:'', arm_l:'', arm_r_flex:'', arm_l_flex:'', leg_r:'', leg_l:'', waist:'', goal:'Ganar músculo', note:'' })

  useEffect(() => { fetchMetrics() }, [])

  async function fetchMetrics() {
    const { data } = await supabase.from('metrics').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setMetrics(data || [])
  }

  async function save() {
    if (!form.weight) return
    await supabase.from('metrics').insert({ ...form, user_id: user.id, date: new Date().toISOString().split('T')[0] })
    setForm({ weight:'', body_fat:'', muscle_pct:'', water_pct:'', imc:'', body_age:'', arm_r:'', arm_l:'', arm_r_flex:'', arm_l_flex:'', leg_r:'', leg_l:'', waist:'', goal:'Ganar músculo', note:'' })
    fetchMetrics(); setTab('historial')
  }

  const goals = ['Bajar peso / grasa','Ganar músculo','Mejorar resistencia','Rendimiento deportivo']

  return (
    <div className="fade-in">
      <div className="tabs">
        <button className={`tab-btn ${tab==='registro'?'active':''}`} onClick={() => setTab('registro')}>Registrar</button>
        <button className={`tab-btn ${tab==='historial'?'active':''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {tab === 'registro' && <>
        <div className="card" style={{ marginBottom:'12px' }}>
          <div className="stitle" style={{ marginBottom:'12px' }}>Bioimpedancia</div>
          <div className="g3" style={{ marginBottom:'8px' }}>
            <div className="field"><label>Peso (kg)</label><input type="number" step="0.1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} placeholder="70.5" /></div>
            <div className="field"><label>Grasa (%)</label><input type="number" step="0.1" value={form.body_fat} onChange={e=>setForm({...form,body_fat:e.target.value})} placeholder="18" /></div>
            <div className="field"><label>Músculo (%)</label><input type="number" step="0.1" value={form.muscle_pct} onChange={e=>setForm({...form,muscle_pct:e.target.value})} placeholder="42" /></div>
          </div>
          <div className="g3">
            <div className="field"><label>Agua (%)</label><input type="number" step="0.1" value={form.water_pct} onChange={e=>setForm({...form,water_pct:e.target.value})} placeholder="55" /></div>
            <div className="field"><label>IMC</label><input type="number" step="0.1" value={form.imc} onChange={e=>setForm({...form,imc:e.target.value})} placeholder="22" /></div>
            <div className="field"><label>Edad corp.</label><input type="number" value={form.body_age} onChange={e=>setForm({...form,body_age:e.target.value})} placeholder="24" /></div>
          </div>
        </div>
        <div className="card" style={{ marginBottom:'12px' }}>
          <div className="stitle" style={{ marginBottom:'12px' }}>Circunferencias (cm)</div>
          <div className="g2" style={{ marginBottom:'8px' }}>
            <div className="field"><label>Brazo der. relajado</label><input type="number" step="0.1" value={form.arm_r} onChange={e=>setForm({...form,arm_r:e.target.value})} placeholder="31.5" /></div>
            <div className="field"><label>Brazo izq. relajado</label><input type="number" step="0.1" value={form.arm_l} onChange={e=>setForm({...form,arm_l:e.target.value})} placeholder="31.0" /></div>
          </div>
          <div className="g2" style={{ marginBottom:'8px' }}>
            <div className="field"><label>Brazo der. flexionado</label><input type="number" step="0.1" value={form.arm_r_flex} onChange={e=>setForm({...form,arm_r_flex:e.target.value})} placeholder="33.5" /></div>
            <div className="field"><label>Brazo izq. flexionado</label><input type="number" step="0.1" value={form.arm_l_flex} onChange={e=>setForm({...form,arm_l_flex:e.target.value})} placeholder="33.0" /></div>
          </div>
          <div className="g2" style={{ marginBottom:'8px' }}>
            <div className="field"><label>Pierna derecha</label><input type="number" step="0.1" value={form.leg_r} onChange={e=>setForm({...form,leg_r:e.target.value})} placeholder="53.0" /></div>
            <div className="field"><label>Pierna izquierda</label><input type="number" step="0.1" value={form.leg_l} onChange={e=>setForm({...form,leg_l:e.target.value})} placeholder="52.5" /></div>
          </div>
          <div className="field"><label>Cintura</label><input type="number" step="0.1" value={form.waist} onChange={e=>setForm({...form,waist:e.target.value})} placeholder="80.0" /></div>
        </div>
        <div className="card" style={{ marginBottom:'12px' }}>
          <div className="field"><label>Objetivo principal</label>
            <select value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}>
              {goals.map(g=><option key={g}>{g}</option>)}
            </select></div>
          <div className="field"><label>Nota</label><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opcional" /></div>
          <button className="btn primary" style={{ width:'100%' }} onClick={save}>Guardar medición completa</button>
        </div>
      </>}

      {tab === 'historial' && (
        metrics.length === 0 ? <div className="empty">Sin mediciones aún.</div> :
        metrics.map(m => (
          <div className="card" key={m.id} style={{ marginBottom:'10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'12px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{m.date}</span>
              {m.note && <span style={{ fontSize:'12px', color:'var(--text2)', fontStyle:'italic' }}>{m.note}</span>}
            </div>
            <div className="g3" style={{ marginBottom:'8px' }}>
              <div className="metric"><div className="lbl">Peso</div><div className="val" style={{ fontSize:'16px' }}>{m.weight}<span style={{ fontSize:'10px' }}> kg</span></div></div>
              <div className="metric"><div className="lbl">Grasa</div><div className="val" style={{ fontSize:'16px' }}>{m.body_fat}<span style={{ fontSize:'10px' }}>%</span></div></div>
              <div className="metric"><div className="lbl">Músculo</div><div className="val" style={{ fontSize:'16px' }}>{m.muscle_pct}<span style={{ fontSize:'10px' }}>%</span></div></div>
            </div>
            {(m.arm_r||m.waist) && <div style={{ borderTop:'1px solid var(--border)', paddingTop:'10px' }}>
              <div className="stitle" style={{ marginBottom:'8px' }}>Circunferencias</div>
              <div className="g2">
                {[['Brazo der. rel.',m.arm_r],['Brazo izq. rel.',m.arm_l],['Brazo der. flex.',m.arm_r_flex],['Brazo izq. flex.',m.arm_l_flex],['Pierna der.',m.leg_r],['Pierna izq.',m.leg_l]].filter(c=>c[1]).map(c=>(
                  <div key={c[0]} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text2)' }}>{c[0]}</span>
                    <span style={{ color:'var(--green)', fontWeight:700 }}>{c[1]} cm</span>
                  </div>
                ))}
              </div>
              {m.waist && <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'6px 0' }}><span style={{ color:'var(--text2)' }}>Cintura</span><span style={{ color:'var(--green)', fontWeight:700 }}>{m.waist} cm</span></div>}
            </div>}
          </div>
        ))
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
