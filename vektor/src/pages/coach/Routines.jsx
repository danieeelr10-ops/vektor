import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const newSerie = () => ({ reps: '', weight: '' })
const newExItem = () => ({ name: '', exercise_id: '', note: '', series: [newSerie()], expanded: true })
function genBlockId() { return 'blk-' + Math.random().toString(36).slice(2, 8) }

// ─── Exercise Library Panel ───────────────────────────────────────────
function ExLibrary({ exercises, onSelect, onClose, onNewSaved, coachId }) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', category: 'General' })
  const [saving, setSaving] = useState(false)
  const CATS = ['General','Espalda','Pecho','Hombros','Bíceps','Tríceps','Pierna','Glúteos','Core','Funcional']

  const filtered = exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  const byCategory = CATS.reduce((acc, cat) => {
    const items = filtered.filter(e => e.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})
  const custom = filtered.filter(e => e.is_custom)

  async function saveCustom() {
    if (!newEx.name) return
    setSaving(true)
    const { data } = await supabase.from('exercises').insert({
      name: newEx.name, category: newEx.category,
      coach_id: coachId, is_custom: true
    }).select().single()
    setSaving(false)
    setShowAdd(false)
    setNewEx({ name: '', category: 'General' })
    onNewSaved(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#111', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f0f0f0' }}>Biblioteca de ejercicios</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowAdd(true)} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ Nuevo</button>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#f0f0f0', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ejercicio..." style={{ width: '100%', marginBottom: 0 }} autoFocus />
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '10px 16px' }}>
          {custom.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Mis ejercicios</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {custom.map(e => (
                  <button key={e.id} onClick={() => { onSelect(e); onClose() }} style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {items.map(e => (
                  <button key={e.id} onClick={() => { onSelect(e); onClose() }} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#f0f0f0', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {showAdd && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#1a1a1a' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px' }}>Guardar ejercicio propio</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input value={newEx.name} onChange={e => setNewEx({ ...newEx, name: e.target.value })} placeholder="Nombre del ejercicio" style={{ flex: 1, marginBottom: 0 }} />
              <select value={newEx.category} onChange={e => setNewEx({ ...newEx, category: e.target.value })} style={{ width: '120px' }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', fontSize: '12px', color: '#f0f0f0', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveCustom} disabled={saving} style={{ flex: 1, background: '#4ade80', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#000', cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Routine Detail / Editor ──────────────────────────────────────────
function RoutineDetail({ routine, onBack, onSaved, exercises, setExercises, coachId }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState(routine.name)
  const [sport, setSport] = useState(routine.sport || 'General')
  const [saving, setSaving] = useState(false)
  const [showLib, setShowLib] = useState(false)
  const [addingTo, setAddingTo] = useState(null)
  const [suggestions, setSuggestions] = useState({})
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => {
    try {
      const raw = routine.exercises_data
      const data = !raw ? [] : typeof raw === 'string' ? JSON.parse(raw) : raw
      setItems(data.length ? data.map(d => ({ ...d, expanded: false })) : [newExItem()])
    } catch { setItems([newExItem()]) }
  }, [routine.id])

  function toggleExpand(idx) {
    const u = [...items]
    u[idx] = { ...u[idx], expanded: !u[idx].expanded }
    setItems(u)
  }

  function handleExInput(idx, val) {
    const u = [...items]
    u[idx] = { ...u[idx], name: val }
    setItems(u)
    if (val.length < 1) { setSuggestions(s => ({ ...s, [idx]: [] })); return }
    const filtered = exercises
      .filter(e => e.name.toLowerCase().includes(val.toLowerCase()))
      .sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(val.toLowerCase())
        const bi = b.name.toLowerCase().indexOf(val.toLowerCase())
        return ai - bi
      })
      .slice(0, 8)
    setSuggestions(s => ({ ...s, [idx]: filtered }))
  }

  function selectFromSuggestion(idx, ex) {
    const u = [...items]
    u[idx] = { ...u[idx], name: ex.name, exercise_id: ex.id }
    setItems(u)
    setSuggestions(s => ({ ...s, [idx]: [] }))
  }

  function selectFromLibrary(ex) {
    if (addingTo !== null) {
      const u = [...items]
      u[addingTo] = { ...u[addingTo], name: ex.name, exercise_id: ex.id }
      setItems(u)
    } else {
      setItems(prev => [...prev, { ...newExItem(), name: ex.name, exercise_id: ex.id }])
    }
    setAddingTo(null)
  }

  function addSerie(idx) {
    const u = [...items]
    u[idx].series = [...u[idx].series, newSerie()]
    setItems([...u])
  }

  function removeSerie(idx, si) {
    if (items[idx].series.length <= 1) return
    const u = [...items]
    u[idx].series = u[idx].series.filter((_, i) => i !== si)
    setItems([...u])
  }

  function updateSerie(idx, si, field, val) {
    const u = [...items]
    u[idx].series[si] = { ...u[idx].series[si], [field]: val }
    setItems([...u])
  }

  function updateNote(idx, val) {
    const u = [...items]
    u[idx].note = val
    setItems([...u])
  }

  function removeExercise(idx) {
    if (items.length <= 1) { setItems([newExItem()]); return }
    setItems(items.filter((_, i) => i !== idx))
  }

  function addBlankExercise() {
    setItems(prev => [...prev, newExItem()])
  }

  function addBiserie() {
    const blockId = genBlockId()
    setItems(prev => [...prev, { ...newExItem(), block: blockId }, { ...newExItem(), block: blockId }])
  }

  function addTriserie() {
    const blockId = genBlockId()
    setItems(prev => [...prev, { ...newExItem(), block: blockId }, { ...newExItem(), block: blockId }, { ...newExItem(), block: blockId }])
  }

  function removeFromBlock(idx) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const { block, ...rest } = it
      return rest
    }))
  }

  function addToBlock(blockId) {
    setItems(prev => {
      const lastIdx = prev.reduce((acc, it, i) => it.block === blockId ? i : acc, -1)
      const copy = [...prev]
      copy.splice(lastIdx + 1, 0, { ...newExItem(), block: blockId })
      return copy
    })
  }

  async function save() {
    if (!name) return
    setSaving(true)
    const exData = items.filter(i => i.name).map(({ expanded, ...rest }) => rest)
    const description = exData.map(ex =>
      ex.series.map((s, si) => `${ex.name} — S${si+1}: ${s.reps||'?'} reps @ ${s.weight||'?'}kg`).join('\n')
    ).join('\n')
    await supabase.from('routines').update({ name, sport, description, exercises_data: JSON.stringify(exData) }).eq('id', routine.id)
    setSaving(false)
    onSaved()
  }

  // Block metadata
  const blockCounts = {}
  const blockFirstIdx = {}
  const blockLastIdx = {}
  items.forEach((item, idx) => {
    if (!item.block) return
    blockCounts[item.block] = (blockCounts[item.block] || 0) + 1
    if (blockFirstIdx[item.block] === undefined) blockFirstIdx[item.block] = idx
    blockLastIdx[item.block] = idx
  })
  const blockLabel = (blockId) => {
    const n = blockCounts[blockId] || 0
    if (n === 2) return 'BISERIE'
    if (n === 3) return 'TRISERIE'
    return 'CIRCUITO'
  }

  const thS = { padding: '6px 8px', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="fade-in">
      {showLib && (
        <ExLibrary
          exercises={exercises}
          coachId={coachId}
          onSelect={selectFromLibrary}
          onClose={() => { setShowLib(false); setAddingTo(null) }}
          onNewSaved={ex => setExercises(prev => [...prev, ex])}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <button className="btn sm" onClick={onBack}>← Volver</button>
        <input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, fontSize: '15px', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, color: '#f0f0f0', padding: '4px 0' }} />
        <select value={sport} onChange={e => setSport(e.target.value)} style={{ fontSize: '11px', width: '100px' }}>
          {sports.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Compact table overview */}
      <div style={{ background: '#111', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 60px 28px', gap: 0 }}>
          <div style={thS}>Ejercicio</div>
          <div style={{ ...thS, textAlign: 'center' }}>S</div>
          <div style={{ ...thS, textAlign: 'center' }}>R</div>
          <div style={{ ...thS, textAlign: 'center', color: '#4ade80' }}>Kg</div>
          <div style={thS}></div>
        </div>

        {items.map((item, idx) => {
          const inBlock = !!item.block
          const isFirst = inBlock && blockFirstIdx[item.block] === idx
          const isLast  = inBlock && blockLastIdx[item.block] === idx
          const blockBorder = inBlock ? '3px solid rgba(251,191,36,0.55)' : 'none'

          return (
            <div key={idx}>
              {/* Block header */}
              {isFirst && (
                <div style={{ padding: '5px 10px', background: 'rgba(251,191,36,0.07)', borderBottom: '1px solid rgba(251,191,36,0.15)', borderLeft: blockBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    ⛓ {blockLabel(item.block)}
                  </span>
                </div>
              )}

              {/* Compact row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 60px 28px 28px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: blockBorder, background: item.expanded ? (inBlock ? 'rgba(251,191,36,0.04)' : 'rgba(74,222,128,0.04)') : 'transparent' }}>
                <div style={{ padding: '6px 8px', position: 'relative' }}>
                  <input
                    value={item.name}
                    onChange={e => handleExInput(idx, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => { e.stopPropagation(); if (item.name.length >= 2) handleExInput(idx, item.name) }}
                    placeholder="Escribe para buscar..."
                    style={{ marginBottom: 0, fontSize: '12px', fontWeight: item.name ? 600 : 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '5px 8px', width: '100%', color: '#f0f0f0' }}
                  />
                  {suggestions[idx]?.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', zIndex: 100, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                      onClick={e => e.stopPropagation()}>
                      {suggestions[idx].map(s => (
                        <div key={s.id} onClick={() => selectFromSuggestion(idx, s)} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#f0f0f0' }}>{s.name}</span>
                          <span style={{ fontSize: '10px', color: '#555', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>{s.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', padding: '8px 4px' }}>{item.name ? item.series.length : '—'}</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', padding: '8px 4px' }}>{item.series[0]?.reps || '—'}</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#4ade80', fontWeight: 700, padding: '8px 4px' }}>
                  {item.series.length > 1
                    ? `${item.series[0]?.weight||'?'}→${item.series[item.series.length-1]?.weight||'?'}`
                    : item.series[0]?.weight ? `${item.series[0].weight}kg` : '—'}
                </div>
                <div style={{ textAlign: 'center', padding: '8px 4px' }} onClick={e => { e.stopPropagation(); removeExercise(idx) }}>
                  <span style={{ color: '#f87171', fontSize: '14px', cursor: 'pointer' }}>×</span>
                </div>
                <div style={{ textAlign: 'center', padding: '4px 2px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); if (item.name) toggleExpand(idx) }}
                    style={{ width: '22px', height: '22px', borderRadius: '5px', border: `1px solid ${item.expanded ? (inBlock ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.4)') : 'rgba(255,255,255,0.1)'}`, background: item.expanded ? (inBlock ? 'rgba(251,191,36,0.12)' : 'rgba(74,222,128,0.12)') : 'transparent', color: item.expanded ? (inBlock ? '#fbbf24' : '#4ade80') : '#555', cursor: item.name ? 'pointer' : 'default', fontSize: '9px', fontFamily: 'inherit' }}
                  >{item.expanded ? '▲' : '▼'}</button>
                </div>
              </div>

              {/* Expanded series editor */}
              {item.expanded && (
                <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)', borderLeft: blockBorder, padding: '10px 12px' }}>
                  <input value={item.note || ''} onChange={e => updateNote(idx, e.target.value)} placeholder="Nota / indicación (opcional)" style={{ marginBottom: '8px', fontSize: '11px', background: '#1a1a1a' }} />
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111', borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, textAlign: 'left', padding: '5px 8px' }}>Serie</th>
                        <th style={{ ...thS, padding: '5px 8px', textAlign: 'center' }}>Reps</th>
                        <th style={{ ...thS, padding: '5px 8px', textAlign: 'center', color: '#4ade80' }}>Peso kg</th>
                        <th style={{ ...thS, padding: '5px 8px', width: '28px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.series.map((s, si) => (
                        <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '4px 8px', color: '#4ade80', fontWeight: 700, fontSize: '12px' }}>S{si+1}</td>
                          <td style={{ padding: '3px 4px' }}>
                            <input type="number" value={s.reps} onChange={e => updateSerie(idx, si, 'reps', e.target.value)} placeholder="10" style={{ marginBottom: 0, textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '3px 4px' }}>
                            <input type="number" step="0.5" value={s.weight} onChange={e => updateSerie(idx, si, 'weight', e.target.value)} placeholder="20" style={{ marginBottom: 0, textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                            <button onClick={() => removeSerie(idx, si)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px' }}>−</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn sm" style={{ flex: 1, fontSize: '11px' }} onClick={() => addSerie(idx)}>+ Serie</button>
                    <button className="btn sm" style={{ fontSize: '11px' }} onClick={() => { setAddingTo(idx); setShowLib(true) }}>Cambiar ejercicio</button>
                    {inBlock && (
                      <button className="btn sm" style={{ fontSize: '11px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }} onClick={() => removeFromBlock(idx)}>Desagrupar</button>
                    )}
                  </div>
                </div>
              )}

              {/* Block footer */}
              {isLast && (
                <div style={{ padding: '4px 10px', background: 'rgba(251,191,36,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: blockBorder, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => addToBlock(item.block)} style={{ background: 'transparent', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '6px', padding: '3px 10px', fontSize: '10px', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    + al bloque
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button className="btn sm" style={{ flex: 1 }} onClick={addBlankExercise}>+ Ejercicio</button>
        <button className="btn sm" style={{ flex: 1 }} onClick={() => { setAddingTo(null); setShowLib(true) }}>Biblioteca</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button className="btn sm" style={{ flex: 1, color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)' }} onClick={addBiserie}>⛓ Biserie</button>
        <button className="btn sm" style={{ flex: 1, color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)' }} onClick={addTriserie}>⛓ Triserie</button>
      </div>

      <button className="btn primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar rutina'}
      </button>
    </div>
  )
}

// ─── Main Routines List ───────────────────────────────────────────────
export default function Routines({ athleteId }) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', sport: 'General' })
  const [saving, setSaving] = useState(false)
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => { fetchAll() }, [athleteId])

  async function fetchAll() {
    let q = supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending: false })
    if (athleteId) q = q.eq('athlete_id', athleteId)
    else q = q.is('athlete_id', null)
    const [{ data: r }, { data: e }] = await Promise.all([
      q,
      supabase.from('exercises').select('id,name,category,is_custom,coach_id').order('name')
    ])
    setRoutines(r || [])
    setExercises(e || [])
  }

  async function createRoutine() {
    if (!newForm.name) return
    setSaving(true)
    const payload = {
      name: newForm.name, sport: newForm.sport,
      coach_id: user.id, exercises_data: JSON.stringify([])
    }
    if (athleteId) payload.athlete_id = athleteId
    const { data } = await supabase.from('routines').insert(payload).select().single()
    setSaving(false)
    setShowNew(false)
    setNewForm({ name: '', sport: 'General' })
    if (data) { await fetchAll(); setSelected(data) }
  }

  async function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id)
    fetchAll()
  }

  function parseExData(r) {
    try {
      const raw = r.exercises_data
      return !raw ? [] : typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch { return [] }
  }

  if (selected) {
    return (
      <RoutineDetail
        routine={selected}
        exercises={exercises}
        setExercises={setExercises}
        coachId={user.id}
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

      {!routines.length && <div className="empty">Crea tu primera rutina para asignarla a atletas.</div>}

      {routines.map(r => {
        const exData = parseExData(r)
        const totalSeries = exData.reduce((a, ex) => a + (ex.series?.length || 0), 0)
        return (
          <div key={r.id}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelected(r)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '3px' }}>{r.name}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {r.sport}{exData.length > 0 ? ` · ${exData.length} ejercicios · ${totalSeries} series` : ' · Sin ejercicios'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>Editar ›</span>
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
