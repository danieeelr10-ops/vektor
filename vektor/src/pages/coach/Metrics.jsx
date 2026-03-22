import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachMetrics() {
  const [athletes, setAthletes] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [metrics, setMetrics] = useState([])
  const [tab, setTab] = useState('registro')
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState({
    weight:'', body_fat:'', muscle_pct:'', muscle_kg:'', water_pct:'', imc:'', body_age:'',
    fat_visceral:'', bones_kg:'', obesity_grade:'',
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
    if (!selectedAthlete) return
    const { data, error } = await supabase.from('metrics').select('*').eq('user_id', selectedAthlete).order('date', { ascending: false })
    if (error) console.error('fetchMetrics error:', error)
    setMetrics(data || [])
  }

  async function saveEdit() {
    if (!editingMetric) return
    setEditSaving(true)
    const clean = {}
    Object.entries(editingMetric).forEach(([k, v]) => {
      if (['id','user_id','date','goal','note','pdf_url'].includes(k)) { clean[k] = v }
      else { clean[k] = v === '' ? null : parseFloat(v) || null }
    })
    await supabase.from('metrics').update(clean).eq('id', editingMetric.id)
    setEditSaving(false)
    setEditingMetric(null)
    fetchHistory()
  }

  async function deleteMetric(id) {
    if (!confirm('¿Eliminar esta medición?')) return
    await supabase.from('metrics').delete().eq('id', id)
    fetchHistory()
  }

  async function uploadPdf(athleteId, date) {
    if (!pdfFile) return null
    const path = `${athleteId}/${date}-${Date.now()}.pdf`
    const { error } = await supabase.storage.from('metrics-pdfs').upload(path, pdfFile, { contentType: 'application/pdf' })
    if (error) { alert('Error subiendo PDF: ' + error.message); return null }
    const { data } = supabase.storage.from('metrics-pdfs').getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!selectedAthlete) { alert('Selecciona un atleta'); return }
    if (!form.weight && !pdfFile) { alert('Agrega el peso o sube el PDF de báscula'); return }
    setSaving(true)
    const dateStr = new Date().toISOString().split('T')[0]
    let pdfUrl = null
    if (pdfFile) { setPdfUploading(true); pdfUrl = await uploadPdf(selectedAthlete, dateStr); setPdfUploading(false) }
    const clean = {}
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'goal' || k === 'note') { clean[k] = v }
      else { clean[k] = v === '' ? null : parseFloat(v) || null }
    })
    if (pdfUrl) clean.pdf_url = pdfUrl
    const { error } = await supabase.from('metrics').insert({ ...clean, user_id: selectedAthlete, date: new Date().toISOString().split('T')[0] })
    if (error) { alert('Error al guardar: ' + error.message); setSaving(false); return }
    setForm({ weight:'', body_fat:'', muscle_pct:'', muscle_kg:'', water_pct:'', imc:'', body_age:'', fat_visceral:'', bones_kg:'', obesity_grade:'', arm_r:'', arm_l:'', arm_r_flex:'', arm_l_flex:'', leg_r:'', leg_l:'', waist:'', goal:'Ganar músculo', note:'' })
    setSaving(false)
    await fetchMetrics()
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
            <div className="g3" style={{ marginBottom:'8px' }}>
              <div className="field"><label>Músculo (kg)</label><input type="number" step="0.1" value={form.muscle_kg} onChange={e=>setForm({...form,muscle_kg:e.target.value})} placeholder="38" /></div>
              <div className="field"><label>Agua (%)</label><input type="number" step="0.1" value={form.water_pct} onChange={e=>setForm({...form,water_pct:e.target.value})} placeholder="55" /></div>
              <div className="field"><label>IMC</label><input type="number" step="0.1" value={form.imc} onChange={e=>setForm({...form,imc:e.target.value})} placeholder="22" /></div>
            </div>
            <div className="g3">
              <div className="field"><label>Grasa visc.</label><input type="number" step="0.1" value={form.fat_visceral} onChange={e=>setForm({...form,fat_visceral:e.target.value})} placeholder="2" /></div>
              <div className="field"><label>Huesos (kg)</label><input type="number" step="0.1" value={form.bones_kg} onChange={e=>setForm({...form,bones_kg:e.target.value})} placeholder="3.2" /></div>
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
            <div className="field">
              <label>PDF de báscula (opcional)</label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', background:'#1a1a1a', border:`1px solid ${pdfFile ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius:'8px', padding:'9px 12px', cursor:'pointer' }}>
                <span style={{ fontSize:'16px' }}>📄</span>
                <span style={{ fontSize:'12px', color: pdfFile ? 'var(--green)' : 'var(--text2)', flex:1 }}>{pdfFile ? pdfFile.name : 'Subir PDF de báscula'}</span>
                {pdfFile && <span onClick={e=>{e.preventDefault();e.stopPropagation();setPdfFile(null)}} style={{ color:'#f87171', fontSize:'16px', lineHeight:1 }}>×</span>}
                <input type="file" accept=".pdf,application/pdf" onChange={e=>setPdfFile(e.target.files[0]||null)} style={{ display:'none' }} />
              </label>
            </div>
            <button className="btn primary" style={{ width:'100%' }} onClick={save} disabled={saving||pdfUploading}>
              {pdfUploading ? 'Subiendo PDF...' : saving ? 'Guardando...' : `Guardar medidas de ${athlete?.name || 'atleta'}`}
            </button>
          </div>
        </>
      )}

      {tab === 'historial' && (
        metrics.length === 0
          ? <div className="empty">Sin medidas registradas para este atleta.</div>
          : metrics.map(m => (
            <div className="card" key={m.id} style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <span style={{ fontSize:'12px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{m.date}</span>
                  {m.goal && <span style={{ fontSize:'11px', color:'var(--green)', fontWeight:600, marginLeft:'8px' }}>{m.goal}</span>}
                </div>
                <div style={{ display:'flex', gap:'5px' }}>
                  {m.pdf_url && (
                    <a href={m.pdf_url} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'6px', padding:'3px 9px', fontSize:'10px', color:'var(--green)', textDecoration:'none', fontWeight:700 }}>
                      📄 PDF
                    </a>
                  )}
                  <button className="btn sm" style={{ fontSize:'10px', padding:'3px 8px' }} onClick={() => setEditingMetric({...m})}>✏️</button>
                  <button className="btn sm" style={{ fontSize:'10px', padding:'3px 8px', color:'#f87171' }} onClick={() => deleteMetric(m.id)}>×</button>
                </div>
              </div>
              <div className="g3" style={{ marginBottom:'8px' }}>
                {m.weight && <div className="metric"><div className="lbl">Peso</div><div className="val" style={{ fontSize:'16px' }}>{m.weight}<span style={{ fontSize:'10px' }}> kg</span></div></div>}
                {m.body_fat && <div className="metric"><div className="lbl">Grasa</div><div className="val" style={{ fontSize:'16px' }}>{m.body_fat}<span style={{ fontSize:'10px' }}>%</span></div></div>}
                {m.muscle_pct && <div className="metric"><div className="lbl">Músculo</div><div className="val" style={{ fontSize:'16px' }}>{m.muscle_pct}<span style={{ fontSize:'10px' }}>%</span></div></div>}
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
      {/* Edit metric modal */}
      {editingMetric && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditingMetric(null)}>
          <div className="modal">
            <h3>Editar medición — {editingMetric.date}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[['Peso (kg)','weight'],['Grasa %','body_fat'],['Músculo %','muscle_pct'],['Músculo kg','muscle_kg'],['Agua %','water_pct'],['IMC','imc'],['Grasa visc.','fat_visceral'],['Huesos kg','bones_kg'],['Edad cuerpo','body_age'],['Brazo der.','arm_r'],['Brazo izq.','arm_l'],['Pierna der.','leg_r'],['Pierna izq.','leg_l'],['Cintura','waist']].map(([lbl,key]) => (
                <div key={key} className="field" style={{ margin:0 }}>
                  <label style={{ fontSize:'10px' }}>{lbl}</label>
                  <input type="number" step="0.1" value={editingMetric[key]||''} onChange={e => setEditingMetric(prev => ({...prev, [key]: e.target.value}))} style={{ padding:'6px 8px', fontSize:'12px' }} />
                </div>
              ))}
            </div>
            <div className="field" style={{ marginTop:'8px' }}>
              <label>Objetivo</label>
              <select value={editingMetric.goal||''} onChange={e => setEditingMetric(prev => ({...prev, goal: e.target.value}))}>
                {['Bajar peso / grasa','Ganar músculo','Mejorar composición','Mantenimiento','Rendimiento deportivo','Otro'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Nota</label>
              <textarea rows={2} value={editingMetric.note||''} onChange={e => setEditingMetric(prev => ({...prev, note: e.target.value}))} />
            </div>
            {editingMetric.pdf_url && (
              <a href={editingMetric.pdf_url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'6px', padding:'5px 10px', fontSize:'11px', color:'var(--green)', textDecoration:'none', marginBottom:'10px' }}>
                📄 Ver PDF actual
              </a>
            )}
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setEditingMetric(null)}>Cancelar</button>
              <button className="btn primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
