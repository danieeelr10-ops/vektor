import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Routines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sport: 'General' })
  const [items, setItems] = useState([{ name: '', exercise_id: '', note: '', series: [{ reps: '', weight: '' }] }])
  const [suggestions, setSuggestions] = useState({})
  const [saving, setSaving] = useState(false)
  const sports = ['General', 'Fútbol', 'Atletismo', 'Natación', 'Baloncesto', 'Ciclismo', 'Tenis', 'Fuerza', 'Cardio', 'Gym']

  useEffect(() => { fetchRoutines(); fetchExercises() }, [])

  async function fetchExercises() {
    const { data } = await supabase.from('exercises').select('id,name,category').order('name')
    setExercises(data || [])
  }

  async function fetchRoutines() {
    const { data } = await supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending: false })
    setRoutines(data || [])
  }

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
    updated[idx].series = [...updated[idx].series, { reps: '', weight: '' }]
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

  function addExercise() {
    setItems([...items, { name: '', exercise_id: '', note: '', series: [{ reps: '', weight: '' }] }])
  }

  function removeExercise(idx) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  async function saveRoutine() {
    if (!form.name) return
    setSaving(true)
    const exData = items.filter(i => i.name).map(i => ({
      name: i.name, exercise_id: i.exercise_id, note: i.note, series: i.series
    }))
    const description = exData.map(ex =>
      ex.series.map((s, si) => `${ex.name} — S${si + 1}: ${s.reps || '?'} reps @ ${s.weight || '?'}kg`).join('\n')
    ).join('\n')
    await supabase.from('routines').insert({
      name: form.name, sport: form.sport, description,
      coach_id: user.id, exercises_data: JSON.stringify(exData)
    })
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', sport: 'General' })
    setItems([{ name: '', exercise_id: '', note: '', series: [{ reps: '', weight: '' }] }])
    fetchRoutines()
  }

  async function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id)
    fetchRoutines()
  }

  function parseExData(r) {
    try { return r.exercises_data ? JSON.parse(r.exercises_data) : null } catch { return null }
  }

  const thStyle = { padding: '6px 8px', fontSize: '10px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: '#1a1a1a', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }
  const tdStyle = { padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '13px' }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span className="stitle">Rutinas ({routines.length})</span>
        <button className="btn primary sm" onClick={() => setShowModal(true)}>+ Rutina</button>
      </div>

      {!routines.length && <div className="empty">Crea tu primera rutina para asignarla a atletas.</div>}

      {routines.map(r => {
        const exData = parseExData(r)
        return (
          <div className="card" key={r.id} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{r.name}</div>
                <span className="badge blue">{r.sport}</span>
              </div>
              <button className="btn danger sm" onClick={() => deleteRoutine(r.id)}>Eliminar</button>
            </div>
            {exData && exData.map((ex, ei) => (
              <div key={ei} style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0f0f0', marginBottom: '4px' }}>{ex.name}</div>
                {ex.note && <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic', marginBottom: '4px' }}>{ex.note}</div>}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Serie</th>
                        <th style={thStyle}>Reps</th>
                        <th style={{ ...thStyle, color: '#4ade80' }}>Kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.series && ex.series.map((s, si) => (
                        <tr key={si}>
                          <td style={{ ...tdStyle, textAlign: 'left', color: '#4ade80', fontWeight: 700 }}>S{si + 1}</td>
                          <td style={tdStyle}>{s.reps || '—'}</td>
                          <td style={{ ...tdStyle, color: '#4ade80', fontWeight: 700 }}>{s.weight ? `${s.weight}kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h3>Nueva rutina</h3>
            <div className="g2" style={{ marginBottom: '14px' }}>
              <div className="field">
                <label>Nombre</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Fuerza tren inferior" />
              </div>
              <div className="field">
                <label>Deporte</label>
                <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}>
                  {sports.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      value={item.name}
                      onChange={e => handleExInput(idx, e.target.value)}
                      placeholder="Buscar ejercicio..."
                      style={{ marginBottom: 0 }}
                    />
                    {suggestions[idx] && suggestions[idx].length > 0 && (
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

                <input
                  value={item.note}
                  onChange={e => { const u = [...items]; u[idx].note = e.target.value; setItems([...u]) }}
                  placeholder="Nota / indicación (opcional)"
                  style={{ marginBottom: '8px', fontSize: '12px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 28px', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', paddingTop: '4px' }}>Serie</div>
                  <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', paddingTop: '4px' }}>Reps</div>
                  <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', paddingTop: '4px' }}>Peso (kg)</div>
                  <div></div>
                </div>

                {item.series.map((s, si) => (
                  <div key={si} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 28px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>S{si + 1}</div>
                    <input type="number" value={s.reps} onChange={e => updateSerie(idx, si, 'reps', e.target.value)} placeholder="10" style={{ marginBottom: 0, textAlign: 'center' }} />
                    <input type="number" step="0.5" value={s.weight} onChange={e => updateSerie(idx, si, 'weight', e.target.value)} placeholder="20" style={{ marginBottom: 0, textAlign: 'center' }} />
                    <button onClick={() => removeSerie(idx, si)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px', padding: 0, lineHeight: 1 }}>−</button>
                  </div>
                ))}

                <button className="btn sm" style={{ width: '100%', marginTop: '4px' }} onClick={() => addSerie(idx)}>+ Serie</button>
              </div>
            ))}

            <button className="btn sm" style={{ width: '100%', marginBottom: '14px' }} onClick={addExercise}>+ Agregar ejercicio</button>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveRoutine} disabled={saving}>{saving ? 'Guardando...' : 'Guardar rutina'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
