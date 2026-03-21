import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const newSerie = () => ({ reps: '', weight: '' })
const newExercise = () => ({ name: '', exercise_id: '', note: '', series: [newSerie()] })

function RoutineDetail({ routine, onBack, onSaved, exercises }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState(routine.name)
  const [sport, setSport] = useState(routine.sport)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState({})
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => {
    try {
      const data = routine.exercises_data ? JSON.parse(routine.exercises_data) : []
      setItems(data.length ? data : [newExercise()])
    } catch { setItems([newExercise()]) }
  }, [routine.id])

  function handleExInput(idx, val) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], name: val }
    setItems(updated)
    if (val.length < 2) { setSuggestions(s => ({ ...s, [idx]: [] })); return }
    setSuggestions(s => ({ ...s, [idx]: exercises.filter(e => e.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5) }))
  }

  function selectEx(idx, ex) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], name: ex.name, exercise_id: ex.id }
    setItems(updated)
    setSuggestions(s => ({ ...s, [idx]: [] }))
  }

  function addSerie(idx) {
    const updated = [...items]
    updated[idx].series = [...updated[idx].series, newSerie()]
    setItems([...updated])
  }

  function removeSerie(idx, si) {
    if (items[idx].series.length <= 1) return
    const updated = [...items]
    updated[idx].series = updated[idx].series.filter((_, i) => i !== si)
    setItems([...updated])
  }

  function updateSerie(idx, si, field, val) {
    const updated = [...items]
    updated[idx].series[si] = { ...updated[idx].series[si], [field]: val }
    setItems([...updated])
  }

  function addExercise() { setItems([...items, newExercise()]) }
  function removeExercise(idx) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  async function save() {
    if (!name) return
    setSaving(true)
    const exData = items.filter(i => i.name).map(i => ({
      name: i.name, exercise_id: i.exercise_id, note: i.note, series: i.series
    }))
    const description = exData.map(ex =>
      ex.series.map((s, si) => `${ex.name} — S${si + 1}: ${s.reps || '?'} reps @ ${s.weight || '?'}kg`).join('\n')
    ).join('\n')
    await supabase.from('routines').update({
      name, sport, description, exercises_data: JSON.stringify(exData)
    }).eq('id', routine.id)
    setSaving(false)
    onSaved()
  }

  const thS = { padding: '6px 8px', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button className="btn sm" onClick={onBack}>← Volver</button>
        <div style={{ flex: 1 }}>
          <input value={name} onChange={e => setName(e.target.value)} style={{ fontSize: '16px', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, color: '#f0f0f0', padding: '4px 0', width: '100%' }} />
        </div>
        <select value={sport} onChange={e => setSport(e.target.value)} style={{ fontSize: '12px' }}>
          {sports.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {items.map((item, idx) => (
        <div key={idx} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input value={item.name} onChange={e => handleExInput(idx, e.target.value)} placeholder="Buscar ejercicio..." style={{ marginBottom: 0 }} />
              {suggestions[idx]?.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#222', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', zIndex: 100, overflow: 'hidden' }}>
                  {suggestions[idx].map(s => (
                    <div key={s.id} onClick={() => selectEx(idx, s)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.name}</span>
                      <span style={{ fontSize: '10px', color: '#555' }}>{s.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {items.length > 1 && (
              <button onClick={() => removeExercise(idx)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>×</button>
            )}
          </div>

          <input value={item.note || ''} onChange={e => { const u = [...items]; u[idx].note = e.target.value; setItems([...u]) }} placeholder="Nota / indicación (opcional)" style={{ marginBottom: '8px', fontSize: '12px' }} />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left' }}>Serie</th>
                  <th style={thS}>Reps</th>
                  <th style={{ ...thS, color: '#4ade80' }}>Peso (kg)</th>
                  <th style={{ ...thS, width: '28px' }}></th>
                </tr>
              </thead>
              <tbody>
                {item.series.map((s, si) => (
                  <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '6px 8px', color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>S{si + 1}</td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" value={s.reps} onChange={e => updateSerie(idx, si, 'reps', e.target.value)} placeholder="10" style={{ marginBottom: 0, textAlign: 'center', width: '100%' }} />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" step="0.5" value={s.weight} onChange={e => updateSerie(idx, si, 'weight', e.target.value)} placeholder="20" style={{ marginBottom: 0, textAlign: 'center', width: '100%' }} />
                    </td>
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      <button onClick={() => removeSerie(idx, si)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>−</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn sm" style={{ width: '100%', marginTop: '6px', fontSize: '11px' }} onClick={() => addSerie(idx)}>+ Serie</button>
        </div>
      ))}

      <button className="btn sm" style={{ width: '100%', marginBottom: '14px' }} onClick={addExercise}>+ Agregar ejercicio</button>

      <button className="btn primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

export default function Routines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', sport: 'General' })
  const [saving, setSaving] = useState(false)
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }),
      supabase.from('exercises').select('id,name,category').order('name')
    ])
    setRoutines(r || [])
    setExercises(e || [])
  }

  async function createRoutine() {
    if (!newForm.name) return
    setSaving(true)
    const { data } = await supabase.from('routines').insert({
      name: newForm.name, sport: newForm.sport,
      coach_id: user.id, exercises_data: JSON.stringify([newExercise()])
    }).select().single()
    setSaving(false)
    setShowNew(false)
    setNewForm({ name: '', sport: 'General' })
    await fetchAll()
    if (data) setSelected(data)
  }

  async function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id)
    fetchAll()
  }

  function parseExData(r) {
    try { return r.exercises_data ? JSON.parse(r.exercises_data) : [] } catch { return [] }
  }

  if (selected) {
    return (
      <RoutineDetail
        routine={selected}
        exercises={exercises}
        onBack={() => { setSelected(null); fetchAll() }}
        onSaved={() => { setSelected(null); fetchAll() }}
      />
    )
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span className="stitle">Rutinas ({routines.length})</span>
        <button className="btn primary sm" onClick={() => setShowNew(true)}>+ Rutina</button>
      </div>

      {!routines.length && <div className="empty">Crea tu primera rutina.</div>}

      {routines.map(r => {
        const exData = parseExData(r)
        return (
          <div
            key={r.id}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelected(r)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '3px' }}>{r.name}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {r.sport}
                  {exData.length > 0 && ` · ${exData.length} ejercicio${exData.length !== 1 ? 's' : ''}`}
                  {exData.length > 0 && ` · ${exData.reduce((a, ex) => a + (ex.series?.length || 0), 0)} series totales`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>Editar</span>
                <span style={{ color: '#555', fontSize: '18px' }}>›</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}
              onClick={e => e.stopPropagation()}>
              <button className="btn danger sm" style={{ fontSize: '11px' }} onClick={() => deleteRoutine(r.id)}>Eliminar</button>
            </div>
          </div>
        )
      })}

      {showNew && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="modal">
            <h3>Nueva rutina</h3>
            <div className="field"><label>Nombre</label>
              <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Fuerza tren inferior" autoFocus />
            </div>
            <div className="field"><label>Deporte</label>
              <select value={newForm.sport} onChange={e => setNewForm({ ...newForm, sport: e.target.value })}>
                {sports.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn primary" onClick={createRoutine} disabled={saving}>{saving ? 'Creando...' : 'Crear y editar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
