import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart
} from 'recharts'

const EMPTY_FORM = {
  weight: '', muscle_kg: '', body_fat: '', fat_kg: '',
  protein_kg: '', bones_kg: '', water_l: '', lean_mass_kg: '', imc: '',
  arm_r: '', arm_l: '', leg_r: '', leg_l: '', waist: '',
  goal: 'Rendimiento deportivo', note: ''
}

const COMP_FIELDS = [
  ['weight',      'Peso',                    'kg'],
  ['muscle_kg',   'Masa muscular esq.',       'kg'],
  ['body_fat',    '% Grasa corporal',         '%'],
  ['fat_kg',      'Masa grasa',              'kg'],
  ['protein_kg',  'Proteína',                'kg'],
  ['bones_kg',    'Minerales',               'kg'],
  ['water_l',     'Agua corporal',           'L'],
  ['lean_mass_kg','Masa magra',              'kg'],
  ['imc',         'IMC',                     'kg/m²'],
]

const CIRC_FIELDS = [
  ['arm_r',  'Brazo der.',   'cm'],
  ['arm_l',  'Brazo izq.',   'cm'],
  ['leg_r',  'Pierna der.',  'cm'],
  ['leg_l',  'Pierna izq.',  'cm'],
  ['waist',  'Cintura',      'cm'],
]

const ALL_FIELDS = [...COMP_FIELDS, ...CIRC_FIELDS]

// Labels completos para el formulario
const COMP_FORM_LABELS = [
  ['weight',      'Peso (kg)'],
  ['muscle_kg',   'Masa muscular esquelética (kg)'],
  ['body_fat',    '% Grasa corporal'],
  ['fat_kg',      'Masa grasa (kg)'],
  ['protein_kg',  'Proteína (kg)'],
  ['bones_kg',    'Minerales (kg)'],
  ['water_l',     'Agua corporal (L)'],
  ['lean_mass_kg','Masa corporal magra (kg)'],
  ['imc',         'IMC (kg/m²)'],
]
const CIRC_FORM_LABELS = [
  ['arm_r',  'Brazo der. (cm)'],
  ['arm_l',  'Brazo izq. (cm)'],
  ['leg_r',  'Pierna der. (cm)'],
  ['leg_l',  'Pierna izq. (cm)'],
  ['waist',  'Cintura (cm)'],
]

const GOALS = ['Rendimiento deportivo','Bajar peso / grasa','Ganar músculo','Mejorar composición','Mantenimiento']

// Tooltip personalizado
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div style={{ background:'#1a1a1a', border:'1px solid rgba(74,222,128,0.3)', borderRadius:'8px', padding:'10px 14px' }}>
      <div style={{ fontSize:'11px', color:'var(--text2)', marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'18px', fontWeight:700, color:'#4ade80', fontFamily:'var(--mono)' }}>
        {val != null ? val : '—'} <span style={{ fontSize:'11px', fontWeight:400, color:'var(--text2)' }}>{unit}</span>
      </div>
    </div>
  )
}

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
  const [selectedField, setSelectedField] = useState('weight')

  useEffect(() => { fetchAthletes() }, [])
  useEffect(() => { if (selectedAthlete) fetchMetrics() }, [selectedAthlete])

  async function fetchAthletes() {
    const { data } = await supabase.from('profiles').select('id,name,sport').eq('role','athlete').order('name')
    setAthletes(data || [])
    if (data?.length) setSelectedAthlete(data[0].id)
  }

  async function fetchMetrics() {
    if (!selectedAthlete) return
    const { data } = await supabase.from('metrics').select('*').eq('user_id', selectedAthlete).order('date', { ascending: true })
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

  // Datos para gráfica
  const fieldMeta = ALL_FIELDS.find(([k]) => k === selectedField) || ALL_FIELDS[0]
  const chartData = metrics
    .filter(m => m[selectedField] != null)
    .map(m => ({
      date: m.date,
      value: parseFloat(m[selectedField]),
      label: m.date.slice(5), // MM-DD
    }))

  const vals = chartData.map(d => d.value)
  const minVal = vals.length ? Math.min(...vals) : 0
  const maxVal = vals.length ? Math.max(...vals) : 0
  const avgVal = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0
  const first = vals[0]
  const last = vals[vals.length - 1]
  const delta = vals.length >= 2 ? last - first : null
  const deltaPct = first && delta != null ? (delta / first * 100) : null

  return (
    <div className="fade-in">
      <div style={{ marginBottom:'16px' }}>
        <div className="stitle" style={{ marginBottom:'8px' }}>Atleta</div>
        <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)}>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.name} — {a.sport}</option>)}
        </select>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='registro'?'active':''}`} onClick={() => setTab('registro')}>Registrar</button>
        <button className={`tab-btn ${tab==='graficas'?'active':''}`} onClick={() => setTab('graficas')}>Gráficas</button>
        <button className={`tab-btn ${tab==='historial'?'active':''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {/* ── REGISTRO ── */}
      {tab === 'registro' && (
        <>
          <div className="card" style={{ marginBottom:'12px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div className="stitle" style={{ margin:0 }}>Bioimpedancia — {athlete?.name}</div>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width:'auto', padding:'5px 10px', fontSize:'12px' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {COMP_FORM_LABELS.map(([k, lbl]) => (
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
              {CIRC_FORM_LABELS.map(([k, lbl]) => (
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

      {/* ── GRÁFICAS ── */}
      {tab === 'graficas' && (
        <div>
          {metrics.length < 2
            ? <div className="empty">Se necesitan al menos 2 mediciones para ver gráficas.</div>
            : (
            <>
              {/* Selector de campo — Composición */}
              <div className="card" style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Composición corporal</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                  {COMP_FIELDS.map(([k, lbl, unit]) => (
                    <button key={k} onClick={() => setSelectedField(k)} style={{
                      padding:'5px 10px', borderRadius:'20px', border:'1px solid',
                      borderColor: selectedField===k ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                      background: selectedField===k ? 'rgba(74,222,128,0.12)' : 'transparent',
                      color: selectedField===k ? 'var(--green)' : 'var(--text2)',
                      fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      transition:'all .15s'
                    }}>{lbl}</button>
                  ))}
                </div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Circunferencias</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {CIRC_FIELDS.map(([k, lbl, unit]) => (
                    <button key={k} onClick={() => setSelectedField(k)} style={{
                      padding:'5px 10px', borderRadius:'20px', border:'1px solid',
                      borderColor: selectedField===k ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                      background: selectedField===k ? 'rgba(96,165,250,0.12)' : 'transparent',
                      color: selectedField===k ? '#60a5fa' : 'var(--text2)',
                      fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      transition:'all .15s'
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Gráfica */}
              {chartData.length < 2
                ? <div className="card" style={{ textAlign:'center', color:'var(--text2)', fontSize:'13px', padding:'32px' }}>Sin datos suficientes para "{fieldMeta[1]}".</div>
                : (
                <div className="card" style={{ marginBottom:'12px' }}>
                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text1)', marginBottom:'2px' }}>{fieldMeta[1]}</div>
                      <div style={{ fontSize:'11px', color:'var(--text2)' }}>{chartData.length} mediciones · {athlete?.name}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'24px', fontWeight:800, color: CIRC_FIELDS.find(([k])=>k===selectedField)?'#60a5fa':'#4ade80', fontFamily:'var(--mono)', lineHeight:1 }}>
                        {last?.toFixed(1)}
                      </div>
                      <div style={{ fontSize:'10px', color:'var(--text2)', marginTop:'2px' }}>{fieldMeta[2]}</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div style={{ height:'220px', marginLeft:'-8px', marginRight:'-8px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top:8, right:16, left:0, bottom:0 }}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CIRC_FIELDS.find(([k])=>k===selectedField)?'#60a5fa':'#4ade80'} stopOpacity={0.18}/>
                            <stop offset="95%" stopColor={CIRC_FIELDS.find(([k])=>k===selectedField)?'#60a5fa':'#4ade80'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize:10, fill:'#666', fontFamily:'var(--mono)' }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          domain={['auto','auto']}
                          tick={{ fontSize:10, fill:'#666', fontFamily:'var(--mono)' }}
                          axisLine={false} tickLine={false} width={36}
                        />
                        <Tooltip content={<CustomTooltip unit={fieldMeta[2]} />} />
                        <ReferenceLine
                          y={avgVal}
                          stroke="rgba(255,255,255,0.15)"
                          strokeDasharray="4 4"
                          label={{ value:`Prom ${avgVal.toFixed(1)}`, position:'insideTopRight', fontSize:9, fill:'#555' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={CIRC_FIELDS.find(([k])=>k===selectedField)?'#60a5fa':'#4ade80'}
                          strokeWidth={2.5}
                          fill="url(#colorVal)"
                          dot={{ r:4, fill:CIRC_FIELDS.find(([k])=>k===selectedField)?'#60a5fa':'#4ade80', strokeWidth:0 }}
                          activeDot={{ r:6, strokeWidth:0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats row */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginTop:'16px', paddingTop:'16px', borderTop:'1px solid var(--border)' }}>
                    {[
                      { label:'Inicial', value: first?.toFixed(1), unit: fieldMeta[2] },
                      { label:'Actual',  value: last?.toFixed(1),  unit: fieldMeta[2] },
                      { label:'Variación', value: delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—', unit: delta != null ? fieldMeta[2] : '', color: delta == null ? 'var(--text2)' : delta < 0 ? '#4ade80' : delta > 0 ? '#f87171' : 'var(--text2)' },
                      { label:'Prom.', value: avgVal.toFixed(1), unit: fieldMeta[2] },
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg3)', borderRadius:'8px', padding:'10px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:'9px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px' }}>{s.label}</div>
                        <div style={{ fontSize:'15px', fontWeight:800, color: s.color || 'var(--text1)', fontFamily:'var(--mono)' }}>{s.value}</div>
                        <div style={{ fontSize:'9px', color:'var(--text3)' }}>{s.unit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Delta badge */}
                  {deltaPct != null && (
                    <div style={{ marginTop:'10px', display:'flex', justifyContent:'center' }}>
                      <span style={{
                        fontSize:'11px', fontWeight:700, padding:'4px 12px', borderRadius:'20px',
                        background: Math.abs(deltaPct) < 0.01 ? 'rgba(255,255,255,0.06)' : deltaPct < 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                        color: Math.abs(deltaPct) < 0.01 ? 'var(--text2)' : deltaPct < 0 ? '#4ade80' : '#f87171',
                        border: `1px solid ${Math.abs(deltaPct) < 0.01 ? 'rgba(255,255,255,0.08)' : deltaPct < 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                      }}>
                        {deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '='} {Math.abs(deltaPct).toFixed(1)}% desde el inicio
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mini resumen de todos los campos con datos */}
              <div className="card">
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'12px' }}>Resumen general — última medición</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {ALL_FIELDS.map(([k, lbl, unit]) => {
                    const last2 = metrics.filter(m => m[k] != null)
                    if (last2.length === 0) return null
                    const cur = parseFloat(last2[last2.length - 1][k])
                    const prev = last2.length >= 2 ? parseFloat(last2[last2.length - 2][k]) : null
                    const diff = prev != null ? cur - prev : null
                    const isCirc = CIRC_FIELDS.find(([ck]) => ck === k)
                    return (
                      <button key={k} onClick={() => setSelectedField(k)} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'8px 10px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit',
                        background: selectedField === k ? (isCirc ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)') : 'var(--bg3)',
                        border: `1px solid ${selectedField === k ? (isCirc ? 'rgba(96,165,250,0.3)' : 'rgba(74,222,128,0.3)') : 'transparent'}`,
                        transition:'all .15s', textAlign:'left'
                      }}>
                        <span style={{ fontSize:'10px', color:'var(--text2)' }}>{lbl}</span>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'13px', fontWeight:700, fontFamily:'var(--mono)', color: isCirc ? '#60a5fa' : '#4ade80' }}>{cur.toFixed(1)} <span style={{ fontSize:'9px', fontWeight:400, color:'var(--text3)' }}>{unit}</span></div>
                          {diff != null && Math.abs(diff) > 0.01 && (
                            <div style={{ fontSize:'9px', color: diff < 0 ? '#4ade80' : '#f87171' }}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && (
        metrics.length === 0
          ? <div className="empty">Sin medidas registradas para este atleta.</div>
          : [...metrics].reverse().map(m => {
            const compRows = COMP_FORM_LABELS.map(([k, lbl]) => [lbl, m[k]])
            const circRows = CIRC_FORM_LABELS.map(([k, lbl]) => [lbl, m[k]])
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
                          <span style={{ color:'#60a5fa', fontWeight:700, fontFamily:'var(--mono)' }}>{val} cm</span>
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
              {COMP_FORM_LABELS.map(([k, lbl]) => (
                <div key={k} className="field" style={{ margin:0 }}>
                  <label style={{ fontSize:'10px' }}>{lbl}</label>
                  <input type="number" step="0.1" value={editingMetric[k]||''} onChange={e => setEditingMetric(p => ({...p,[k]:e.target.value}))} style={{ padding:'6px 8px', fontSize:'12px' }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Circunferencias</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              {CIRC_FORM_LABELS.map(([k, lbl]) => (
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
