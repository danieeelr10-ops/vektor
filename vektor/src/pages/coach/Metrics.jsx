import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachMetrics() {
  const [athletes, setAthletes] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [metrics, setMetrics] = useState([])
  const [tab, setTab] = useState('registro')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    weight:'', body_fat:'', muscle_pct:'', water_pct:'', imc:'', body_age:'',
    arm_r:'', arm_l:'', arm_r_flex:'', arm_l_flex:'',
    leg_r:'', leg_l:'', waist:'', goal:'Ganar músculo', note:''
  })

  const goals = ['Bajar peso / grasa','Ganar músculo','Mejorar resistencia','Rendimiento deportivo']

  useEffect(() => { fetchAthletes() }, [])
  useEffect(() => { if (selectedAthlete) fetchMetrics() }, [selectedAthlete])

  async function fetchAthletes() {
    const { data } = await supabase.from('profiles').select('id,name,sport').eq('role','athlete').order('name')
    setAthletes(data || [])
    if (data?.length) setSelectedAthlete(data[0].id)
  }

  async function fetchMetrics() {
    const { data } = await supabase.from('metrics').select('*').eq('user_id', selectedAthlete).order('date', { ascending: false })
    setMetrics(data || [])
  }

  async function save() {
    if (!form.weight || !selectedAthlete) return
    setSaving(true)
    await supabase.from('metrics').insert({ ...form, user_id: selectedAthlete, date: new Date().toISOString().split('T')[0] })
    setForm({ weight:'', body_fat:'', muscle_pct:'', water_pct:'', imc:'', body_age:'', arm_r:'', arm_l:'', arm_r_flex:'', arm_l_flex:'', leg_r:'', leg_l:'', waist:'', goal:'Ganar músculo', note:'' })
    setSaving(false)
    fetchMetrics()
    setTab('historial')
  }

  const athlete = athletes.find(a => a.id === selectedAthlete)

  return (
    <div className="fade-in">
      <div style={{ marginBottom:'16px' }}>
        <div className="stitle" style={{ marginBottom:'8px' }}>Atleta</div>
        <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)}>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.name} — {a.sport}</option>)}
        </select>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='registro'?'active':''}`} onClick={() => setTab('registro')}>Registrar medidas</button>
        <button className={`tab-btn ${tab==='historial'?'active':''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {tab === 'registro' && (
        <>
          <div className="card" style={{ marginBottom:'12px' }}>
            <div className="stitle" style={{ marginBottom:'12px' }}>Bioimpedancia — {athlete?.name}</div>
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
              </select>
            </div>
            <div className="field"><label>Nota</label><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Observaciones del entrenador..." /></div>
            <button className="btn primary" style={{ width:'100%' }} onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : `Guardar medidas de ${athlete?.name || 'atleta'}`}
            </button>
          </div>
        </>
      )}

      {tab === 'historial' && (
        metrics.length === 0
          ? <div className="empty">Sin medidas registradas para este atleta.</div>
          : metrics.map(m => (
            <div className="card" key={m.id} style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                <span style={{ fontSize:'12px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{m.date}</span>
                <span style={{ fontSize:'11px', color:'var(--green)', fontWeight:600 }}>{m.goal}</span>
              </div>
              <div className="g3" style={{ marginBottom:'8px' }}>
                <div className="metric"><div className="lbl">Peso</div><div className="val" style={{ fontSize:'16px' }}>{m.weight}<span style={{ fontSize:'10px' }}> kg</span></div></div>
                <div className="metric"><div className="lbl">Grasa</div><div className="val" style={{ fontSize:'16px' }}>{m.body_fat}<span style={{ fontSize:'10px' }}>%</span></div></div>
                <div className="metric"><div className="lbl">Músculo</div><div className="val" style={{ fontSize:'16px' }}>{m.muscle_pct}<span style={{ fontSize:'10px' }}>%</span></div></div>
              </div>
              {(m.arm_r || m.waist) && (
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:'10px' }}>
                  <div className="stitle" style={{ marginBottom:'8px' }}>Circunferencias</div>
                  <div className="g2">
                    {[['Brazo der. rel.',m.arm_r],['Brazo izq. rel.',m.arm_l],['Brazo der. flex.',m.arm_r_flex],['Brazo izq. flex.',m.arm_l_flex],['Pierna der.',m.leg_r],['Pierna izq.',m.leg_l]].filter(c=>c[1]).map(c=>(
                      <div key={c[0]} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ color:'var(--text2)' }}>{c[0]}</span>
                        <span style={{ color:'var(--green)', fontWeight:700 }}>{c[1]} cm</span>
                      </div>
                    ))}
                  </div>
                  {m.waist && <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'6px 0' }}>
                    <span style={{ color:'var(--text2)' }}>Cintura</span>
                    <span style={{ color:'var(--green)', fontWeight:700 }}>{m.waist} cm</span>
                  </div>}
                </div>
              )}
              {m.note && <div style={{ fontSize:'12px', color:'var(--text2)', fontStyle:'italic', marginTop:'8px' }}>"{m.note}"</div>}
            </div>
          ))
      )}
    </div>
  )
}
