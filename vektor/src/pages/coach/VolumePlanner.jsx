import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const MUSCLE_GROUPS = ['Espalda','Pecho','Hombros','Bíceps','Tríceps','Pierna','Glúteos','Core','Funcional']
const MUSCLE_COLORS = {
  'Espalda':'#4ade80','Pecho':'#60a5fa','Hombros':'#fbbf24','Bíceps':'#a78bfa',
  'Tríceps':'#f87171','Pierna':'#34d399','Glúteos':'#f472b6','Core':'#fb923c','Funcional':'#94a3b8'
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return monday.toISOString().split('T')[0]
}

function suggestIncrement(rpe, volDelta) {
  if (rpe >= 9) return 0
  if (rpe >= 8) return 3
  if (rpe >= 7) return 5
  return 7
}

export default function VolumePlanner({ athlete }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [exercises, setExercises] = useState([])
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [increments, setIncrements] = useState({})
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchAll() }, [athlete.id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: e }, { data: r }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name, exercises_data)').eq('athlete_id', athlete.id).eq('completed', true).order('date', { ascending: true }),
      supabase.from('exercises').select('id, name, category').order('name'),
      supabase.from('routines').select('*').eq('coach_id', user.id).order('name')
    ])
    setSessions(s || [])
    setExercises(e || [])
    setRoutines(r || [])
    if (r?.length) setSelectedRoutine(r[0])
    setLoading(false)
  }

  function calcWeeklyData() {
    const weeks = {}
    sessions.forEach(s => {
      if (!s.execution_data || !s.routines?.exercises_data) return
      const weekKey = getWeekKey(s.date)
      if (!weeks[weekKey]) weeks[weekKey] = { total: 0, byMuscle: {}, rpe: [], sessions: 0 }
      weeks[weekKey].sessions++
      if (s.rpe) weeks[weekKey].rpe.push(parseFloat(s.rpe) || 0)
      let execData = {}
      let exData = []
      try { execData = JSON.parse(s.execution_data) } catch {}
      try { exData = JSON.parse(s.routines.exercises_data) } catch {}
      exData.forEach((ex, exIdx) => {
        if (!ex.series) return
        const exInfo = exercises.find(e => e.name === ex.name)
        const muscle = exInfo?.category || 'General'
        ex.series.forEach((_, si) => {
          const reps = parseFloat(execData[`${s.id}-${exIdx}-${si}-reps`]) || 0
          const weight = parseFloat(execData[`${s.id}-${exIdx}-${si}-weight`]) || 0
          const vol = reps * weight
          weeks[weekKey].total += vol
          weeks[weekKey].byMuscle[muscle] = (weeks[weekKey].byMuscle[muscle] || 0) + vol
        })
      })
    })
    return weeks
  }

  function generateSuggestions(weeklyData) {
    const weekKeys = Object.keys(weeklyData).sort()
    const lastKey = weekKeys[weekKeys.length - 1]
    const prevKey = weekKeys[weekKeys.length - 2]
    if (!lastKey) return {}
    const lastWeek = weeklyData[lastKey]
    const prevWeek = weeklyData[prevKey]
    const avgRPE = lastWeek.rpe.length ? lastWeek.rpe.reduce((a,b)=>a+b,0)/lastWeek.rpe.length : 7
    const suggestions = {}
    MUSCLE_GROUPS.forEach(mg => {
      const lastVol = lastWeek.byMuscle[mg] || 0
      const prevVol = prevWeek?.byMuscle[mg] || 0
      if (lastVol === 0) return
      const volDelta = prevVol > 0 ? (lastVol - prevVol) / prevVol : 0
      suggestions[mg] = suggestIncrement(avgRPE, volDelta)
    })
    return suggestions
  }

  function generatePreview() {
    if (!selectedRoutine?.exercises_data) return
    let exData = []
    try { exData = JSON.parse(selectedRoutine.exercises_data) } catch { return }
    const newExData = exData.map(ex => {
      const exInfo = exercises.find(e => e.name === ex.name)
      const muscle = exInfo?.category || 'General'
      const pct = (increments[muscle] !== undefined ? increments[muscle] : 0) / 100
      const newSeries = ex.series?.map(s => ({
        ...s,
        weight: s.weight ? (Math.round(parseFloat(s.weight) * (1 + pct) * 2) / 2).toFixed(1) : s.weight
      })) || ex.series
      return { ...ex, series: newSeries, _muscle: muscle, _pct: pct * 100 }
    })
    setPreview(newExData)
  }

  async function saveAsNewRoutine() {
    if (!preview || !selectedRoutine) return
    setSaving(true)
    const cleanExData = preview.map(({ _muscle, _pct, ...rest }) => rest)
    const description = cleanExData.map(ex =>
      ex.series?.map((s, si) => `${ex.name} — S${si+1}: ${s.reps||'?'} reps @ ${s.weight||'?'}kg`).join('\n')
    ).join('\n')
    const newName = `${selectedRoutine.name} — Sem +${Object.values(increments).filter(v=>v>0).length > 0 ? Object.values(increments).filter(v=>v>0)[0] + '%' : 'prog.'}`
    const { error } = await supabase.from('routines').insert({
      name: newName, sport: selectedRoutine.sport,
      coach_id: user.id, description,
      exercises_data: JSON.stringify(cleanExData)
    })
    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading) return <div style={{ padding: '1rem', color: '#555', textAlign: 'center' }}>Analizando datos...</div>

  const weeklyData = calcWeeklyData()
  const weekKeys = Object.keys(weeklyData).sort()
  const suggestions = generateSuggestions(weeklyData)
  const lastWeek = weeklyData[weekKeys[weekKeys.length-1]]
  const lastAvgRPE = lastWeek?.rpe?.length ? (lastWeek.rpe.reduce((a,b)=>a+b,0)/lastWeek.rpe.length).toFixed(1) : null

  // Init increments from suggestions if empty
  if (Object.keys(increments).length === 0 && Object.keys(suggestions).length > 0) {
    setIncrements({ ...suggestions })
    return null
  }

  const thS = { padding: '8px 10px', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.07)' }
  const tdS = { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }

  return (
    <div>
      {weekKeys.length < 2 ? (
        <div className="empty">Se necesitan al menos 2 semanas de datos de ejecución para usar el planificador.</div>
      ) : (
        <>
          {/* RPE context */}
          {lastAvgRPE && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#888' }}>RPE promedio última semana</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: parseFloat(lastAvgRPE) >= 9 ? '#f87171' : parseFloat(lastAvgRPE) >= 8 ? '#fbbf24' : '#4ade80', fontFamily: 'monospace' }}>{lastAvgRPE}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#555', maxWidth: '180px', textAlign: 'right', lineHeight: 1.5 }}>
                {parseFloat(lastAvgRPE) >= 9 ? 'Intensidad muy alta — mantener volumen' : parseFloat(lastAvgRPE) >= 8 ? 'Buena intensidad — incremento moderado' : 'Bien recuperado — puede subir más volumen'}
              </div>
            </div>
          )}

          {/* Increments per muscle */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
              Ajustar incremento por grupo muscular
            </div>
            {Object.keys(suggestions).map(mg => (
              <div key={mg} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: MUSCLE_COLORS[mg], flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#f0f0f0', fontWeight: 600, flex: 1 }}>{mg}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 3, 5, 7, 10].map(pct => (
                    <button key={pct} onClick={() => setIncrements(prev => ({ ...prev, [mg]: pct }))}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: `1px solid ${increments[mg]===pct?'#4ade80':'rgba(255,255,255,0.1)'}`, background: increments[mg]===pct?'rgba(74,222,128,0.12)':'transparent', color: increments[mg]===pct?'#4ade80':'#888', cursor: 'pointer', fontSize: '12px', fontWeight: increments[mg]===pct?700:400, fontFamily: 'inherit' }}>
                      {pct === 0 ? '=' : `+${pct}%`}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#555', width: '60px', textAlign: 'right' }}>
                  {lastWeek?.byMuscle[mg] ? `Vol: ${Math.round(lastWeek.byMuscle[mg]).toLocaleString()}` : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Routine selector */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Rutina base para ajustar</div>
            <select
              value={selectedRoutine?.id || ''}
              onChange={e => setSelectedRoutine(routines.find(r => r.id === e.target.value))}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="btn primary" style={{ width: '100%' }} onClick={() => { setPreview(null); setSaved(false); generatePreview() }}>
              Calcular nuevos pesos →
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
                Vista previa — pesos sugeridos para la próxima semana
              </div>
              {preview.map((ex, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f0f0f0' }}>{ex.name}</span>
                    {ex._pct > 0 && <span style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>+{ex._pct}% {ex._muscle}</span>}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                      <thead>
                        <tr>
                          <th style={thS}>Serie</th>
                          <th style={thS}>Reps</th>
                          <th style={{ ...thS, color: '#aaa' }}>Kg anterior</th>
                          <th style={{ ...thS, color: '#4ade80' }}>Kg sugerido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.series?.map((s, si) => {
                          const origEx = JSON.parse(selectedRoutine.exercises_data || '[]')[i]
                          const origWeight = origEx?.series?.[si]?.weight
                          return (
                            <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ ...tdS, color: '#4ade80', fontWeight: 700 }}>S{si+1}</td>
                              <td style={tdS}>{s.reps || '—'}</td>
                              <td style={{ ...tdS, color: '#555' }}>{origWeight ? `${origWeight}kg` : '—'}</td>
                              <td style={{ ...tdS, color: '#4ade80', fontWeight: 700 }}>{s.weight ? `${s.weight}kg` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {saved ? (
                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>
                  ✓ Rutina guardada — ya aparece en tu lista de rutinas para asignar
                </div>
              ) : (
                <button className="btn primary" style={{ width: '100%', marginTop: '4px' }} onClick={saveAsNewRoutine} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar como nueva rutina →'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
