import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const tooltipStyle = { background: '#0a0a0a', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '11px' }

const MUSCLE_GROUPS = ['Espalda','Pecho','Hombros','Bíceps','Tríceps','Pierna','Glúteos','Core','Funcional','General']
const MUSCLE_COLORS = {
  'Espalda':'#4ade80','Pecho':'#60a5fa','Hombros':'#fbbf24','Bíceps':'#a78bfa',
  'Tríceps':'#f87171','Pierna':'#34d399','Glúteos':'#f472b6','Core':'#fb923c','Funcional':'#94a3b8','General':'#888'
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return monday.toISOString().split('T')[0]
}

function getWeekLabel(weekKey) {
  const d = new Date(weekKey)
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  return `${d.getDate()}/${d.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}`
}

export default function AthleteDashboardView() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [exercises, setExercises] = useState([])
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('volumen')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: s }, { data: e }, { data: m }] = await Promise.all([
      supabase.from('sessions').select('*, routines(name, exercises_data)').eq('athlete_id', user.id).eq('completed', true).order('date', { ascending: true }),
      supabase.from('exercises').select('id, name, category').order('name'),
      supabase.from('metrics').select('*').eq('user_id', user.id).order('date', { ascending: true })
    ])
    setSessions(s || [])
    setExercises(e || [])
    setMetrics(m || [])
    setLoading(false)
  }

  function calcWeeklyVolume() {
    const weeks = {}
    sessions.forEach(s => {
      if (!s.execution_data || !s.routines?.exercises_data) return
      const weekKey = getWeekKey(s.date)
      if (!weeks[weekKey]) weeks[weekKey] = { total: 0, byMuscle: {}, sessions: 0 }
      weeks[weekKey].sessions++
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

  function calcExerciseProgression() {
    const byEx = {}
    sessions.forEach(s => {
      if (!s.execution_data || !s.routines?.exercises_data) return
      let execData = {}
      let exData = []
      try { execData = JSON.parse(s.execution_data) } catch {}
      try { exData = JSON.parse(s.routines.exercises_data) } catch {}
      exData.forEach((ex, exIdx) => {
        if (!ex.series) return
        if (!byEx[ex.name]) byEx[ex.name] = []
        let totalWeight = 0, count = 0
        ex.series.forEach((_, si) => {
          const w = parseFloat(execData[`${s.id}-${exIdx}-${si}-weight`]) || 0
          if (w > 0) { totalWeight += w; count++ }
        })
        if (count > 0) byEx[ex.name].push({ date: s.date, avgKg: Math.round(totalWeight / count) })
      })
    })
    return byEx
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Calculando tu progreso...</div>

  const weeklyVolume = calcWeeklyVolume()
  const weekKeys = Object.keys(weeklyVolume).sort()
  const exerciseProgression = calcExerciseProgression()

  const lastWeek = weekKeys[weekKeys.length - 1]
  const prevWeek = weekKeys[weekKeys.length - 2]
  const lastVol = weeklyVolume[lastWeek]?.total || 0
  const prevVol = weeklyVolume[prevWeek]?.total || 0
  const volDelta = lastVol - prevVol

  const completed = sessions.length
  const avgRPE = sessions.length ? (sessions.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / sessions.length).toFixed(1) : '—'
  const totalMin = sessions.reduce((a, s) => a + (parseFloat(s.duration) || 0), 0)

  const thS = { padding: '7px 8px', fontSize: '9px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const tdS = { padding: '7px 8px', fontSize: '12px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace' }

  return (
    <div className="fade-in">
      {/* Stats */}
      <div className="g3" style={{ marginBottom: '14px' }}>
        <div className="metric"><div className="lbl">Sesiones</div><div className="val">{completed}</div></div>
        <div className="metric"><div className="lbl">RPE prom.</div><div className="val">{avgRPE}</div></div>
        <div className="metric"><div className="lbl">Min totales</div><div className="val">{Math.round(totalMin)}</div></div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '14px' }}>
        {[['volumen','Volumen'],['progresion','Progresión'],['metricas','Métricas']].map(([id, lbl]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: '7px 4px',
            border: activeTab===id ? '1px solid var(--border2)' : 'none',
            background: activeTab===id ? 'var(--bg3)' : 'transparent',
            color: activeTab===id ? 'var(--green)' : 'var(--text2)',
            fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', borderRadius: '8px', transition: 'all .15s'
          }}>{lbl}</button>
        ))}
      </div>

      {/* VOLUMEN */}
      {activeTab === 'volumen' && (
        <div>
          {weekKeys.length === 0 ? (
            <div className="empty">Completa sesiones registrando pesos reales para ver tu volumen de entrenamiento.</div>
          ) : (
            <>
              {prevWeek && (
                <div className="card" style={{ marginBottom: '12px' }}>
                  <div className="stitle" style={{ marginBottom: '10px' }}>Última semana vs anterior</div>
                  <div className="g3">
                    <div className="metric"><div className="lbl">Sem. anterior</div><div className="val" style={{ fontSize: '16px', color: 'var(--text2)' }}>{Math.round(prevVol).toLocaleString()}</div></div>
                    <div className="metric"><div className="lbl">Última semana</div><div className="val" style={{ fontSize: '16px' }}>{Math.round(lastVol).toLocaleString()}</div></div>
                    <div className="metric"><div className="lbl">Cambio</div>
                      <div className="val" style={{ fontSize: '16px', color: volDelta >= 0 ? 'var(--green)' : '#f87171' }}>
                        {volDelta >= 0 ? '+' : ''}{Math.round(volDelta).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="stitle" style={{ marginBottom: '12px' }}>Volumen semanal (kg·reps)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weekKeys.map(k => ({ semana: getWeekLabel(k), volumen: Math.round(weeklyVolume[k].total) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="semana" tick={{ fill: 'var(--text3)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => v.toLocaleString()} />
                    <Bar dataKey="volumen" fill="var(--green)" radius={[4,4,0,0]} name="Volumen" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="stitle" style={{ marginBottom: '12px' }}>Por grupo muscular</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, textAlign: 'left' }}>Músculo</th>
                        {weekKeys.slice(-4).map(k => <th key={k} style={thS}>{getWeekLabel(k)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {MUSCLE_GROUPS.filter(mg => weekKeys.some(k => weeklyVolume[k]?.byMuscle[mg])).map(mg => {
                        const vals = weekKeys.slice(-4).map(k => weeklyVolume[k]?.byMuscle[mg] || 0)
                        if (!vals.some(v => v > 0)) return null
                        const delta = vals[vals.length-1] - (vals[vals.length-2] || 0)
                        return (
                          <tr key={mg}>
                            <td style={{ ...tdS, textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: MUSCLE_COLORS[mg] }} />
                                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{mg}</span>
                                {vals[vals.length-2] > 0 && <span style={{ fontSize: '10px', color: delta >= 0 ? 'var(--green)' : '#f87171' }}>{delta >= 0 ? '↑' : '↓'}</span>}
                              </div>
                            </td>
                            {vals.map((v, i) => (
                              <td key={i} style={{ ...tdS, color: v > 0 ? 'var(--text)' : 'var(--text3)', background: i===vals.length-1 && v>0 ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
                                {v > 0 ? v.toLocaleString() : '—'}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                      <tr style={{ background: 'var(--bg3)' }}>
                        <td style={{ ...tdS, textAlign: 'left', fontFamily: 'inherit', color: 'var(--green)', fontWeight: 700 }}>TOTAL</td>
                        {weekKeys.slice(-4).map(k => <td key={k} style={{ ...tdS, color: 'var(--green)', fontWeight: 700 }}>{Math.round(weeklyVolume[k]?.total||0).toLocaleString()}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* PROGRESIÓN */}
      {activeTab === 'progresion' && (
        <div>
          {Object.entries(exerciseProgression).filter(([_, d]) => d.length >= 2).length === 0
            ? <div className="empty">Necesitas al menos 2 registros por ejercicio para ver progresión.</div>
            : Object.entries(exerciseProgression).filter(([_, d]) => d.length >= 2).map(([exName, data]) => {
              const delta = data[data.length-1].avgKg - data[0].avgKg
              const pct = data[0].avgKg > 0 ? ((delta/data[0].avgKg)*100).toFixed(1) : null
              return (
                <div key={exName} className="card" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{exName}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: delta >= 0 ? 'var(--green)' : '#f87171', fontFamily: 'monospace' }}>{delta >= 0 ? '+' : ''}{delta}kg</div>
                      {pct && <div style={{ fontSize: '10px', color: delta >= 0 ? 'var(--green)' : '#f87171' }}>{delta >= 0 ? '+' : ''}{pct}%</div>}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={70}>
                    <LineChart data={data.map(d => ({ fecha: d.date.slice(5), kg: d.avgKg }))}>
                      <XAxis dataKey="fecha" tick={{ fill: 'var(--text3)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} domain={['auto','auto']} width={28} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="kg" stroke={delta >= 0 ? 'var(--green)' : '#f87171'} strokeWidth={2} dot={{ r: 3 }} name="Kg prom." />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })
          }
        </div>
      )}

      {/* MÉTRICAS */}
      {activeTab === 'metricas' && (
        <div>
          {metrics.length < 2
            ? <div className="empty">Registra al menos 2 mediciones para ver tu progreso físico.</div>
            : <>
              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="stitle" style={{ marginBottom: '12px' }}>Peso y composición</div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={metrics.map(m => ({ date: m.date?.slice(5), peso: parseFloat(m.weight)||null, grasa: parseFloat(m.body_fat)||null, musculo: parseFloat(m.muscle_pct)||null }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} domain={['auto','auto']} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="peso" stroke="var(--green)" strokeWidth={2} dot={false} name="Peso kg" />
                    <Line type="monotone" dataKey="grasa" stroke="#f87171" strokeWidth={2} dot={false} name="Grasa %" />
                    <Line type="monotone" dataKey="musculo" stroke="var(--blue)" strokeWidth={2} dot={false} name="Músculo %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          }
        </div>
      )}
    </div>
  )
}
