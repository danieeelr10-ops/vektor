import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Routines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'', sport:'General', description:'' })
  const sports = ['General','Fútbol','Atletismo','Natación','Baloncesto','Ciclismo','Tenis','Fuerza','Cardio','Gym']

  useEffect(() => { fetchRoutines() }, [])

  async function fetchRoutines() {
    const { data } = await supabase.from('routines').select('*').eq('coach_id', user.id).order('created_at', { ascending:false })
    setRoutines(data || [])
  }

  async function saveRoutine() {
    if (!form.name) return
    await supabase.from('routines').insert({ ...form, coach_id: user.id })
    setShowModal(false); setForm({ name:'', sport:'General', description:'' }); fetchRoutines()
  }

  async function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id); fetchRoutines()
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
            <div style={{ marginTop:'10px', fontSize:'13px', color:'var(--text2)', whiteSpace:'pre-line', background:'var(--bg3)', padding:'10px 12px', borderRadius:'8px', fontFamily:'var(--mono)', lineHeight:1.8 }}>
              {r.description}
            </div>
          )}
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Nueva rutina</h3>
            <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Fuerza tren inferior" /></div>
            <div className="field"><label>Deporte / categoría</label>
              <select value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})}>
                {sports.map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div className="field"><label>Ejercicios / descripción</label>
              <textarea rows={6} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={'Sentadilla: 4x8 @ 75%\nPeso muerto: 3x6\nLunge: 3x12 cada pierna'} /></div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveRoutine}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
