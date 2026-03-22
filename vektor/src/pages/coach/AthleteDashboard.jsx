import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import VolumePlanner from './VolumePlanner'

const tooltipStyle = { background: '#111', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '11px' }

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

function Delta({ label, value, unit = '', invert = false }) {
  if (value === null || value === undefined || isNaN(value)) return null
  const num = parseFloat(value)
  const positive = invert ? num < 0 : num > 0
  const color = num === 0 ? '#888' : positive ? '#4ade80' : '#f87171'
  const sign = num > 0 ? '+' : ''
  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color, fontFamily: 'monospace' }}>{sign}{num.toFixed(1)}<span style={{ fontSize: '10px' }}>{unit}</span></div>
      {/* PLANIFICADOR TAB */}
      {activeTab === 'planner' && (
        <div>
          <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Planificador de volumen — {athlete.name}</div>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
              Basado en los datos de ejecución real, la app sugiere los incrementos de carga para la próxima semana. Ajusta los % y genera una nueva rutina lista para asignar.
            </div>
          </div>
          <VolumePlanner athlete={athlete} />
        </div>
      )}
    </div>
  )
}

export default function AthleteDashboard({ athlete, onBack }) {
  const [metrics, setMetrics] = useState([])
  const [sessions, setSessions] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('volumen')
  const [showPlanner, setShowPlanner] = useState(false)

  useEffect(() => { fetchAll() }, [athlete.id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: m }, { data: s }, { data: e }] = await Promise.all([
      supabase.from('metrics').select('*').eq('user_id', athlete.id).order('date', { ascending: true }),
      supabase.from('sessions').select('*, routines(name, exercises_data)').eq('athlete_id', athlete.id).eq('completed', true).order('date', { ascending: true }),
      supabase.from('exercises').select('id, name, category').order('name')
    ])
    setMetrics(m || [])
    setSessions(s || [])
    setExercises(e || [])
    setLoading(false)
  }

  // ── Volume calculation ────────────────────────────────────────────
  function calcWeeklyVolume() {
    const weeks = {}
    sessions.forEach(s => {
      if (!s.execution_data || !s.routines?.exercises_data) return
      const weekKey = getWeekKey(s.date)
      if (!weeks[weekKey]) weeks[weekKey] = { total: 0, byMuscle: {}, sessions: 0, planned: 0 }
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
    const byExercise = {}
    sessions.forEach(s => {
      if (!s.execution_data || !s.routines?.exercises_data) return
      let execData = {}
      let exData = []
      try { execData = JSON.parse(s.execution_data) } catch {}
      try { exData = JSON.parse(s.routines.exercises_data) } catch {}
      exData.forEach((ex, exIdx) => {
        if (!ex.series) return
        if (!byExercise[ex.name]) byExercise[ex.name] = []
        let totalWeight = 0, count = 0
        ex.series.forEach((_, si) => {
          const w = parseFloat(execData[`${s.id}-${exIdx}-${si}-weight`]) || 0
          if (w > 0) { totalWeight += w; count++ }
        })
        if (count > 0) byExercise[ex.name].push({ date: s.date, avgKg: Math.round(totalWeight / count) })
      })
    })
    return byExercise
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Calculando...</div>

  const weeklyVolume = calcWeeklyVolume()
  const weekKeys = Object.keys(weeklyVolume).sort()
  const exerciseProgression = calcExerciseProgression()

  // Weekly volume chart data
  const volChartData = weekKeys.map(k => ({
    semana: getWeekLabel(k),
    volumen: Math.round(weeklyVolume[k].total),
    sesiones: weeklyVolume[k].sessions,
    ...MUSCLE_GROUPS.reduce((acc, mg) => ({ ...acc, [mg]: Math.round(weeklyVolume[k].byMuscle[mg] || 0) }), {})
  }))

  // Last 2 weeks comparison
  const lastWeek = weekKeys[weekKeys.length - 1]
  const prevWeek = weekKeys[weekKeys.length - 2]
  const lastVol = weeklyVolume[lastWeek]?.total || 0
  const prevVol = weeklyVolume[prevWeek]?.total || 0
  const volDelta = lastVol - prevVol
  const volDeltaPct = prevVol > 0 ? ((volDelta / prevVol) * 100).toFixed(1) : null

  // Metrics
  const first = metrics[0]
  const last = metrics[metrics.length - 1]
  const hasDelta = metrics.length >= 2
  const completed = sessions.length
  const avgRPE = sessions.length ? (sessions.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / sessions.length).toFixed(1) : '—'
  const totalMin = sessions.reduce((a, s) => a + (parseFloat(s.duration) || 0), 0)

  const thS = { padding: '8px 10px', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
  const tdS = { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {onBack && <button className="btn sm" onClick={onBack}>← Volver</button>}
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{athlete.name}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Dashboard de rendimiento</div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
        {[['Sesiones', completed], ['RPE prom.', avgRPE], ['Min totales', Math.round(totalMin)]].map(([l, v]) => (
          <div key={l} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', marginTop: '4px' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px' }}>
        {[['volumen','Volumen'],['progresion','Progresión'],['metricas','Métricas'],['planner','Planificador']].map(([id, lbl]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: '7px 4px', border: activeTab===id ? '1px solid rgba(74,222,128,0.3)' : 'none',
            background: activeTab===id ? '#222' : 'transparent',
            color: activeTab===id ? '#4ade80' : '#888',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', borderRadius: '8px'
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── VOLUMEN TAB ── */}
      {activeTab === 'volumen' && (
        <div>
          {weekKeys.length === 0 ? (
            <div className="empty">Sin datos de ejecución aún. El atleta debe completar sesiones registrando pesos reales.</div>
          ) : (
            <>
              {/* Week comparison */}
              {prevWeek && (
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
                    Comparación — última vs semana anterior
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Semana ant.</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#aaa', fontFamily: 'monospace' }}>{Math.round(prevVol).toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Última semana</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{Math.round(lastVol).toLocaleString()}</div>
                    </div>
                    <div style={{ background: volDelta >= 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${volDelta >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Δ Volumen</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: volDelta >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                        {volDelta >= 0 ? '+' : ''}{Math.round(volDelta).toLocaleString()}
                        {volDeltaPct && <span style={{ fontSize: '10px', marginLeft: '3px' }}>({volDelta >= 0 ? '+' : ''}{volDeltaPct}%)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Volume chart */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Volumen total por semana (kg·reps)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={volChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="semana" tick={{ fill: '#555', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#555', fontSize: 9 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => v.toLocaleString()} />
                    <Bar dataKey="volumen" fill="#4ade80" radius={[4,4,0,0]} name="Volumen total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly volume table by muscle group */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Volumen por grupo muscular / semana</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, textAlign: 'left' }}>Músculo</th>
                        {weekKeys.slice(-6).map(k => <th key={k} style={thS}>{getWeekLabel(k)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {MUSCLE_GROUPS.filter(mg => weekKeys.some(k => weeklyVolume[k]?.byMuscle[mg])).map(mg => {
                        const vals = weekKeys.slice(-6).map(k => weeklyVolume[k]?.byMuscle[mg] || 0)
                        const hasData = vals.some(v => v > 0)
                        if (!hasData) return null
                        const lastVal = vals[vals.length - 1]
                        const prevVal = vals[vals.length - 2]
                        const delta = prevVal > 0 ? lastVal - prevVal : null
                        return (
                          <tr key={mg}>
                            <td style={{ ...tdS, textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: MUSCLE_COLORS[mg], flexShrink: 0 }} />
                                <span style={{ color: '#f0f0f0', fontWeight: 600 }}>{mg}</span>
                                {delta !== null && <span style={{ fontSize: '10px', color: delta >= 0 ? '#4ade80' : '#f87171' }}>{delta >= 0 ? '↑' : '↓'}</span>}
                              </div>
                            </td>
                            {vals.map((v, i) => (
                              <td key={i} style={{ ...tdS, color: v > 0 ? '#f0f0f0' : '#333', background: i === vals.length-1 && v > 0 ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
                                {v > 0 ? v.toLocaleString() : '—'}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                      {/* Total row */}
                      <tr style={{ background: '#1a1a1a', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ ...tdS, textAlign: 'left', fontFamily: 'inherit', color: '#4ade80', fontWeight: 700 }}>TOTAL</td>
                        {weekKeys.slice(-6).map(k => (
                          <td key={k} style={{ ...tdS, color: '#4ade80', fontWeight: 700 }}>
                            {Math.round(weeklyVolume[k]?.total || 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sessions vs planned */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Sesiones completadas por semana</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, textAlign: 'left' }}>Semana</th>
                        <th style={thS}>Sesiones</th>
                        <th style={thS}>Volumen total</th>
                        <th style={thS}>RPE prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekKeys.slice(-8).reverse().map(k => {
                        const weekSessions = sessions.filter(s => getWeekKey(s.date) === k)
                        const weekRPE = weekSessions.length ? (weekSessions.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / weekSessions.length).toFixed(1) : '—'
                        return (
                          <tr key={k}>
                            <td style={{ ...tdS, textAlign: 'left', fontFamily: 'inherit', color: '#aaa' }}>{getWeekLabel(k)}</td>
                            <td style={{ ...tdS, color: '#4ade80', fontWeight: 700 }}>{weeklyVolume[k]?.sessions || 0}</td>
                            <td style={{ ...tdS, color: '#f0f0f0' }}>{Math.round(weeklyVolume[k]?.total || 0).toLocaleString()}</td>
                            <td style={{ ...tdS, color: '#fbbf24' }}>{weekRPE}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PROGRESIÓN TAB ── */}
      {activeTab === 'progresion' && (
        <div>
          {Object.keys(exerciseProgression).length === 0 ? (
            <div className="empty">Sin datos de progresión aún.</div>
          ) : Object.entries(exerciseProgression).filter(([_, data]) => data.length >= 2).map(([exName, data]) => {
            const first = data[0].avgKg
            const last = data[data.length-1].avgKg
            const delta = last - first
            const pct = first > 0 ? ((delta / first) * 100).toFixed(1) : null
            return (
              <div key={exName} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{exName}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{data.length} registros</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: delta >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                      {delta >= 0 ? '+' : ''}{delta}kg
                    </div>
                    {pct && <div style={{ fontSize: '10px', color: delta >= 0 ? '#4ade80' : '#f87171' }}>{delta >= 0 ? '+' : ''}{pct}%</div>}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={data.map(d => ({ fecha: d.date.slice(5), kg: d.avgKg }))}>
                    <XAxis dataKey="fecha" tick={{ fill: '#555', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#555', fontSize: 9 }} domain={['auto','auto']} width={30} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="kg" stroke={delta >= 0 ? '#4ade80' : '#f87171'} strokeWidth={2} dot={{ fill: delta >= 0 ? '#4ade80' : '#f87171', r: 3 }} name="Kg prom." />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          })}
          {Object.values(exerciseProgression).every(d => d.length < 2) && (
            <div className="empty">Necesitas al menos 2 registros por ejercicio para ver progresión.</div>
          )}
        </div>
      )}

      {/* ── MÉTRICAS TAB ── */}
      {activeTab === 'metricas' && (
        <div>
          {metrics.length === 0 && <div className="empty">Sin mediciones registradas.</div>}

          {hasDelta && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
                Resumen ({first?.date} → {last?.date})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '8px' }}>
                <Delta label="Δ Peso" value={(parseFloat(last?.weight)-parseFloat(first?.weight))} unit=" kg" invert={true} />
                <Delta label="Δ Grasa%" value={(parseFloat(last?.body_fat)-parseFloat(first?.body_fat))} unit="%" invert={true} />
                <Delta label="Δ Músculo%" value={(parseFloat(last?.muscle_pct)-parseFloat(first?.muscle_pct))} unit="%" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                <Delta label="Δ Músculo kg" value={(parseFloat(last?.muscle_kg)-parseFloat(first?.muscle_kg))} unit=" kg" />
                <Delta label="Δ IMC" value={(parseFloat(last?.imc)-parseFloat(first?.imc))} unit="" invert={true} />
                <Delta label="Δ Cintura" value={(parseFloat(last?.waist)-parseFloat(first?.waist))} unit=" cm" invert={true} />
              </div>
            </div>
          )}

          {metrics.length >= 2 && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Peso y composición</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={metrics.map(m => ({ date: m.date?.slice(5), peso: parseFloat(m.weight)||null, grasa: parseFloat(m.body_fat)||null, musculo: parseFloat(m.muscle_pct)||null }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} domain={['auto','auto']} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="peso" stroke="#4ade80" strokeWidth={2} dot={false} name="Peso kg" />
                  <Line type="monotone" dataKey="grasa" stroke="#f87171" strokeWidth={2} dot={false} name="Grasa %" />
                  <Line type="monotone" dataKey="musculo" stroke="#60a5fa" strokeWidth={2} dot={false} name="Músculo %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Full metrics table */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Historial completo</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {['Fecha','Peso','Grasa%','Músculo%','Músculo kg','Agua%','IMC','Cintura'].map(h => <th key={h} style={thS}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().map((m, i) => (
                    <tr key={m.id} style={{ background: i%2===0?'transparent':'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...tdS, color: '#aaa' }}>{m.date}</td>
                      <td style={{ ...tdS, color: '#f0f0f0', fontWeight: 600 }}>{m.weight||'—'}</td>
                      <td style={tdS}>{m.body_fat||'—'}</td>
                      <td style={tdS}>{m.muscle_pct||'—'}</td>
                      <td style={{ ...tdS, color: '#4ade80' }}>{m.muscle_kg||'—'}</td>
                      <td style={tdS}>{m.water_pct||'—'}</td>
                      <td style={tdS}>{m.imc||'—'}</td>
                      <td style={{ ...tdS, color: '#fbbf24' }}>{m.waist||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* PLANIFICADOR TAB */}
      {activeTab === 'planner' && (
        <div>
          <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Planificador de volumen — {athlete.name}</div>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
              Basado en los datos de ejecución real, la app sugiere los incrementos de carga para la próxima semana. Ajusta los % y genera una nueva rutina lista para asignar.
            </div>
          </div>
          <VolumePlanner athlete={athlete} />
        </div>
      )}
    </div>
  )
}
