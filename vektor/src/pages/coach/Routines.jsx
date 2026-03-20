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
        <span className="stitle">Rutinas ({routines.length})</s
