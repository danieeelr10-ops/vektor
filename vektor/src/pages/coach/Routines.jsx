import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_EX = { exercise_id:'', name:'', sets:'', reps:'', weight:'', note:'' }

export default function Routines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'', sport:'General' })
  const [items, setItems] = useState([{ ...EMPTY_EX }])
  const [suggestions, setSuggestions] = useState({})
  const [saving, setSaving] = useState(false)
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => { fetchRoutines(); fetchExercises() }, [])

  async function fetchExercises() {
    const { data } = await supabase.from('exercises').select('id,name,category').order('category').order('name')
    setExercises(data || [])
  }

  async function fetchRoutines() {
    const { data } = await supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending:false })
    setRoutines(data || [])
  }

  function handleExInput(idx, val) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], name: val }
    setItems(updated)
    if (val.length < 2) { setSuggestions(s => ({ ...s, [idx]:[] })); return }
    setSuggestions(s => ({ ...s, [idx]: exercises.filter(e => e.name.toLowerCase().includes(val.toLowerCase())).slice(0,5) }))
  }

  function selectEx(idx, ex) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], name: ex.name, exercise_id: ex.id }
    setItems(updated)
    setSuggestions(s => ({ ...s, [idx]:[] }))
  }

  function updateItem(idx, field, val) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: val }
    setItems(updated)
  }

  function addItem() { setItems([...items, { ...EMPTY_EX }]) }
  function removeItem(idx) { setItems(items.filter((_,i) => i !== idx)) }

  async function saveRoutine() {
    if (!form.name || items.every(i => !i.name)) return
    setSaving(true)
    const description = items.filter(i => i.name).map(i =>
      `${i.name}: ${i.sets||'?'} series × ${i.reps||'?'} reps${i.weight ? ` @ ${i.weight}kg` : ''}${i.note ? ` (${i.note})` : ''}`
    ).join('\n')
    await supabase.from('routines').insert({ name: form.name, sport: form.sport, description, coach_id: user.id, exercises_data: JSON.stringify(items.filter(i=>i.name)) })
    setSaving(false)
    setShowModal(false)
    setForm({ name:'', sport:'General' })
    setItems([{ ...EMPTY_EX }])
    fetchRoutines()
  }

  async function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id)
    fetchRoutines()
  }

  function parseDescription(desc) {
    if (!desc) return []
    return desc.split('\n').filter(Boolean)
  }

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <span className="stitle">Rutinas ({routines.length})</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Rutina</button>
      </div>

      {!routines.length && <div className="empty">Crea tu primera rutina para asignarla a atletas.</div>}

      {routines.map(r => (
        <div className="card" key={r.id} style={{ marginBottom:'10px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{r.name}</div>
              <span className="badge blue">{r.sport}</span>
            </div>
            <button className="btn danger sm" onClick={() => deleteRoutine(r.id)}>Eliminar</button>
          </div>
          {r.description && (
            <div style={{ marginTop:'10px', background:'var(--bg3)', borderRadius:'8px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'6px', padding:'8px 10px', fontSize:'9px', color:'var(--text3)', fontWeight:700, borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:'.04em' }}>
                <span>Ejercicio</span><span style={{ textAlign:'center' }}>Series</span><span style={{ textAlign:'center' }}>Reps</span><span style={{ textAlign:'center' }}>Peso</span>
              </div>
              {parseDescription(r.description).map((line, i) => {
                const match = line.match(/^(.+?):\s*(\S+)\s*series\s*×\s*(\S+)\s*reps(?:\s*@\s*(\S+)kg)?/)
                if (match) return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'6px', padding:'8px 10px', fontSize:'12px', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontWeight:500 }}>{match[1]}</span>
                    <span style={{ textAlign:'center', color:'var(--green)', fontWeight:700 }}>{match[2]}</span>
                    <span style={{ textAlign:'center' }}>{match[3]}</span>
                    <span style={{ textAlign:'center', color:'var(--text2)' }}>{match[4] ? `${match[4]}kg` : '—'}</span>
                  </div>
                )
                return <div key={i} style={{ padding:'6px 10px', fontSize:'12px', color:'var(--text2)', borderBottom:'1px solid var(--border)' }}>{line}</div>
              })}
            </div>
          )}
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth:'500px' }}>
            <h3>Nueva rutina</h3>
            <div className="g2" style={{ marginBottom:'10px' }}>
              <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Fuerza tren inferior" /></div>
              <div className="field"><label>Deporte</label>
                <select value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})}>
                  {sports.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="stitle" style={{ marginBottom:'8px' }}>Ejercicios</div>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 28px', gap:'6px', marginBottom:'6px' }}>
              {['Ejercicio','Series','Reps','Peso (kg)',''].map((h,i) => (
                <div key={i} style={{ fontSize:'9px', color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</div>
              ))}
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ position:'relative', marginBottom:'6px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 28px', gap:'6px' }}>
                  <div style={{ position:'relative' }}>
                    <input value={item.name} onChange={e=>handleExInput(idx,e.target.value)} placeholder="Buscar ejercicio..." style={{ marginBottom:0 }} />
                    {suggestions[idx]?.length > 0 && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', zIndex:100, overflow:'hidden' }}>
                        {suggestions[idx].map(s => (
                          <div key={s.id} onClick={() => selectEx(idx,s)} style={{ padding:'7px 10px', cursor:'pointer', fontSize:'12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                            <span>{s.name}</span>
                            <span style={{ fontSize:'10px', color:'var(--text3)' }}>{s.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" value={item.sets} onChange={e=>updateItem(idx,'sets',e.target.value)} placeholder="4" style={{ marginBottom:0, textAlign:'center' }} />
                  <input value={item.reps} onChange={e=>updateItem(idx,'reps',e.target.value)} placeholder="12" style={{ marginBottom:0, textAlign:'center' }} />
                  <input type="number" step="0.5" value={item.weight} onChange={e=>updateItem(idx,'weight',e.target.value)} placeholder="0" style={{ marginBottom:0, textAlign:'center' }} />
                  <button onClick={() => removeItem(idx)} style={{ background:'transparent', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'16px', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              </div>
            ))}

            <button className="btn sm" style={{ width:'100%', marginTop:'8px', marginBottom:'16px' }} onClick={addItem}>+ Agregar ejercicio</button>

            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => { setShowModal(false); setItems([{ ...EMPTY_EX }]) }}>Cancelar</button>
              <button className="btn primary" onClick={saveRoutine} disabled={saving}>{saving?'Guardando...':'Guardar rutina'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
