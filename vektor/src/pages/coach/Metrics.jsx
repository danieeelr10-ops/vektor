import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = {
  weight: '', muscle_kg: '', body_fat: '', fat_kg: '',
  protein_kg: '', bones_kg: '', water_l: '', lean_mass_kg: '', imc: '',
  arm_r: '', arm_l: '', leg_r: '', leg_l: '', waist: '',
  goal: 'Rendimiento deportivo', note: ''
}

const COMP_FIELDS = [
  ['weight',     'Peso (kg)'],
  ['muscle_kg',  'Masa muscular esquelética (kg)'],
  ['body_fat',   '% Grasa corporal'],
  ['fat_kg',     'Masa grasa (kg)'],
  ['protein_kg', 'Proteína (kg)'],
  ['bones_kg',   'Minerales (kg)'],
  ['water_l',    'Agua corporal (L)'],
  ['lean_mass_kg','Masa corporal magra (kg)'],
  ['imc',        'IMC (kg/m²)'],
]

const CIRC_FIELDS = [
  ['arm_r',  'Brazo der. (cm)'],
  ['arm_l',  'Brazo izq. (cm)'],
  ['leg_r',  'Pierna der. (cm)'],
  ['leg_l',  'Pierna izq. (cm)'],
  ['waist',  'Cintura (cm)'],
]

const GOALS = ['Rendimiento deportivo','Bajar peso / grasa','Ganar músculo','Mejorar composición','Mantenimiento']

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
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { fetchAthletes() }, [])
  useEffect(() => { if (selectedAthlete) fetchMetrics() }, [selectedAthlete])

  async function fetchAthletes() {
    const { data } = await supabase.from('profiles').select('id,name,sport').eq('role','athlete').order('name')
    setAthletes(data || [])
    if (data?.length) setSelectedAthlete(data[0].id)
  }

  async function fetchMetrics() {
    if (!selectedAthlete) return
    const { data } = await supabase.from('metrics').select('*').eq('user_id', selectedAthlete).order('date', { ascending: false })
    setMetrics(data || [])
  }

  function numericPayload(obj) {
    const clean = {}
    Object.entries(obj).forEach(([k, v]) => {
      if (['id','user_id','date','goal','note','pdf_url','created_at'].includes(k)) clean[k] = v
      else clean[k] = v === '' || v === null ? null : parseFloat(v) || null
    })
    return clean
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
    setSaving(true)
    let pdfUrl = null
    if (pdfFile) { setPdfUploading(true); pdfUrl = await uploadPdf(selectedAthlete, formDate); setPdfUploading(false) }
    const payload = numericPayload({ ...form, user_id: selectedAthlete, date: formDate })
    if (pdfUrl) payload.pdf_url = pdfUrl
    const { error } = await supabase.from('metrics').insert(payload)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setForm({ ...EMPTY_FORM })
    setPdfFile(null)
    setSaving(false)
    await fetchMetrics()
    setTab('historial')
  }

  async function saveEdit() {
    if (!editingMetric) return
    setEditSaving(true)
    const { error } = await supabase.from('metrics').update(numericPayload(editingMetric)).eq('id', editingMetric.id)
    if (error) alert('Error: ' + error.message)
    setEditSaving(false)
    setEditingMetric(null)
    fetchMetrics()
  }

  async function deleteMetric(id) {
    if (!confirm('¿Eliminar esta medición?')) return
    const { error } = await supabase.from('metrics').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchMetrics()
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
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div className="stitle" style={{ margin:0 }}>Bioimpedancia — {athlete?.name}</div>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width:'auto', padding:'5px 10px', fontSize:'12px' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {COMP_FIELDS.map(([k, lbl]) => (
                <div key={k} className="field" style={{ margin:0 }}>
                  <label>{lbl}</label>
                  <input type="number" step="0.1" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} placeholder="—" />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom:'12px' }}>
            <div className="stitle" style={{ marginBottom:'12px' }}>Circunferencias (cm)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {CIRC_FIELDS.map(([k, lbl]) => (
                <div key={k} className="field" style={{ margin:0 }}>
                  <label>{lbl}</label>
                  <input type="number" step="0.1" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} placeholder="—" />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom:'12px' }}>
            <div className="field"><label>Objetivo</label>
              <select value={form.goal} onChange={e => setForm({...form, goal: e.target.value})}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field"><label>Nota</label>
              <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Observaciones..." />
            </div>
            <div className="field">
              <label>PDF de báscula (opcional)</label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', background:'#1a1a1a', border:`1px solid ${pdfFile?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.08)'}`, borderRadius:'8px', padding:'9px 12px', cursor:'pointer' }}>
                <span style={{ fontSize:'16px' }}>📄</span>
                <span style={{ fontSize:'12px', color: pdfFile?'var(--green)':'var(--text2)', flex:1 }}>{pdfFile ? pdfFile.name : 'Subir PDF de báscula'}</span>
                {pdfFile && <span onClick={e=>{e.preventDefault();e.stopPropagation();setPdfFile(null)}} style={{ color:'#f87171', fontSize:'16px' }}>×</span>}
                <input type="file" accept=".pdf,application/pdf" onChange={e => setPdfFile(e.target.files[0]||null)} style={{ display:'none' }} />
              </label>
            </div>
            <button className="btn primary" style={{ width:'100%' }} onClick={save} disabled={saving||pdfUploading}>
              {pdfUploading ? 'Subiendo PDF...' : saving ? 'Guardando...' : `Guardar medidas — ${athlete?.name||'atleta'}`}
            </button>
          </div>
        </>
      )}

      {tab === 'historial' && (
        metrics.length === 0
          ? <div className="empty">Sin medidas registradas para este atleta.</div>
          : metrics.map(m => {
            const compRows = COMP_FIELDS.map(([k, lbl]) => [lbl, m[k]])
            const circRows = CIRC_FIELDS.map(([k, lbl]) => [lbl, m[k]])
            return (
              <div className="card" key={m.id} style={{ marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                  <div>
                    <span style={{ fontSize:'12px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{m.date}</span>
                    {m.goal && <span style={{ fontSize:'11px', color:'var(--green)', fontWeight:600, marginLeft:'8px' }}>{m.goal}</span>}
                  </div>
                  <div style={{ display:'flex', gap:'5px' }}>
                    {m.pdf_url && <a href={m.pdf_url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'6px', padding:'3px 9px', fontSize:'10px', color:'var(--green)', textDecoration:'none', fontWeight:700 }}>📄 PDF</a>}
                    <button className="btn sm" style={{ fontSize:'10px', padding:'3px 8px' }} onClick={() => setEditingMetric({...m})}>✏️</button>
                    <button className="btn sm" style={{ fontSize:'10px', padding:'3px 8px', color:'#f87171' }} onClick={() => deleteMetric(m.id)}>×</button>
                  </div>
                </div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Composición corporal</div>
                <div style={{ borderRadius:'8px', overflow:'hidden', marginBottom:'10px' }}>
                  {compRows.filter(([,v]) => v != null).map(([lbl, val], i) => (
                    <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background: i%2===0?'var(--bg3)':'var(--bg2)', fontSize:'12px' }}>
                      <span style={{ color:'var(--text2)' }}>{lbl}</span>
                      <span style={{ color:'var(--green)', fontWeight:700, fontFamily:'var(--mono)' }}>{val}</span>
                    </div>
                  ))}
                </div>
                {circRows.some(([,v]) => v) && (
                  <>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Circunferencias</div>
                    <div style={{ borderRadius:'8px', overflow:'hidden' }}>
                      {circRows.filter(([,v]) => v).map(([lbl, val], i) => (
                        <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background: i%2===0?'var(--bg3)':'var(--bg2)', fontSize:'12px' }}>
                          <span style={{ color:'var(--text2)' }}>{lbl}</span>
                          <span style={{ color:'var(--green)', fontWeight:700, fontFamily:'var(--mono)' }}>{val} cm</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {m.note && <div style={{ fontSize:'12px', color:'var(--text2)', fontStyle:'italic', marginTop:'8px' }}>"{m.note}"</div>}
              </div>
            )
          })
      )}

      {/* Edit modal */}
      {editingMetric && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditingMetric(null)}>
          <div className="modal">
            <h3>Editar medición — {editingMetric.date}</h3>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Composición corporal</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              {COMP_FIELDS.map(([k, lbl]) => (
                <div key={k} className="field" style={{ margin:0 }}>
                  <label style={{ fontSize:'10px' }}>{lbl}</label>
                  <input type="number" step="0.1" value={editingMetric[k]||''} onChange={e => setEditingMetric(p => ({...p,[k]:e.target.value}))} style={{ padding:'6px 8px', fontSize:'12px' }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Circunferencias</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              {CIRC_FIELDS.map(([k, lbl]) => (
                <div key={k} className="field" style={{ margin:0 }}>
                  <label style={{ fontSize:'10px' }}>{lbl}</label>
                  <input type="number" step="0.1" value={editingMetric[k]||''} onChange={e => setEditingMetric(p => ({...p,[k]:e.target.value}))} style={{ padding:'6px 8px', fontSize:'12px' }} />
                </div>
              ))}
            </div>
            <div className="field"><label>Objetivo</label>
              <select value={editingMetric.goal||''} onChange={e => setEditingMetric(p => ({...p,goal:e.target.value}))}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field"><label>Nota</label>
              <textarea rows={2} value={editingMetric.note||''} onChange={e => setEditingMetric(p => ({...p,note:e.target.value}))} />
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setEditingMetric(null)}>Cancelar</button>
              <button className="btn primary" onClick={saveEdit} disabled={editSaving}>{editSaving?'Guardando...':'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
