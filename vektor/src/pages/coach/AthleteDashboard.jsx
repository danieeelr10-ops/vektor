import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const tooltipStyle = { background: '#111', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '11px' }

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
    </div>
  )
}

export default function AthleteDashboard({ athlete, onBack }) {
  const [metrics, setMetrics] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [athlete.id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from('metrics').select('*').eq('user_id', athlete.id).order('date', { ascending: true }),
      supabase.from('sessions').select('id,completed,rpe,duration,date').eq('athlete_id', athlete.id)
    ])
    setMetrics(m || [])
    setSessions(s || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Cargando...</div>

  const first = metrics[0]
  const last = metrics[metrics.length - 1]
  const hasDelta = metrics.length >= 2

  function delta(field) {
    if (!hasDelta) return null
    const a = parseFloat(first?.[field])
    const b = parseFloat(last?.[field])
    if (isNaN(a) || isNaN(b)) return null
    return b - a
  }

  const completed = sessions.filter(s => s.completed)
  const avgRPE = completed.length ? (completed.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / completed.length).toFixed(1) : '—'
  const totalMin = completed.reduce((a, s) => a + (parseFloat(s.duration) || 0), 0)

  const chartData = metrics.map(m => ({
    date: m.date?.slice(5),
    peso: parseFloat(m.weight) || null,
    grasa: parseFloat(m.body_fat) || null,
    musculo_pct: parseFloat(m.muscle_pct) || null,
    musculo_kg: parseFloat(m.muscle_kg) || null,
    imc: parseFloat(m.imc) || null,
    agua: parseFloat(m.water_pct) || null,
  }))

  const circData = metrics.map(m => ({
    date: m.date?.slice(5),
    arm_r: parseFloat(m.arm_r) || null,
    arm_l: parseFloat(m.arm_l) || null,
    waist: parseFloat(m.waist) || null,
    leg_r: parseFloat(m.leg_r) || null,
  }))

  const thS = { padding: '8px 10px', fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
  const tdS = { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }
  const tdSL = { ...tdS, textAlign: 'left', fontFamily: 'inherit', color: '#aaa' }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn sm" onClick={onBack}>← Volver</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{athlete.name}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Dashboard de progreso · {metrics.length} mediciones</div>
        </div>
      </div>

      {metrics.length === 0 && (
        <div className="empty">Sin mediciones registradas para este atleta.</div>
      )}

      {metrics.length > 0 && (
        <>
          {/* Session stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              ['Sesiones', sessions.length],
              ['Completadas', completed.length],
              ['RPE prom.', avgRPE],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{lbl}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', marginTop: '4px' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Latest measurement */}
          <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
              Última medición — {last?.date}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '6px' }}>
              {[['Peso', last?.weight, 'kg'], ['Grasa', last?.body_fat, '%'], ['Músculo%', last?.muscle_pct, '%'], ['Músculo', last?.muscle_kg, 'kg']].map(([l, v, u]) => v ? (
                <div key={l} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', marginTop: '3px' }}>{v}<span style={{ fontSize: '9px' }}>{u}</span></div>
                </div>
              ) : null)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[['Agua', last?.water_pct, '%'], ['IMC', last?.imc, ''], ['Gr.Visc.', last?.fat_visceral, ''], ['Edad corp.', last?.body_age, '']].map(([l, v, u]) => v ? (
                <div key={l} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', marginTop: '3px' }}>{v}<span style={{ fontSize: '9px' }}>{u}</span></div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Deltas */}
          {hasDelta && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
                Resumen de progreso ({first?.date} → {last?.date})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                <Delta label="Δ Peso" value={delta('weight')} unit=" kg" invert={true} />
                <Delta label="Δ Grasa%" value={delta('body_fat')} unit="%" invert={true} />
                <Delta label="Δ Músculo%" value={delta('muscle_pct')} unit="%" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <Delta label="Δ Músculo kg" value={delta('muscle_kg')} unit=" kg" />
                <Delta label="Δ IMC" value={delta('imc')} unit="" invert={true} />
                <Delta label="Δ Cintura" value={delta('waist')} unit=" cm" invert={true} />
              </div>
            </div>
          )}

          {/* Charts */}
          {metrics.length >= 2 && (
            <>
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Peso y composición</div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#555', fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="peso" stroke="#4ade80" strokeWidth={2} dot={false} name="Peso kg" />
                    <Line type="monotone" dataKey="grasa" stroke="#f87171" strokeWidth={2} dot={false} name="Grasa %" />
                    <Line type="monotone" dataKey="musculo_pct" stroke="#60a5fa" strokeWidth={2} dot={false} name="Músculo %" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '10px', color: '#888' }}>
                  <span><span style={{ display: 'inline-block', width: '8px', height: '2px', background: '#4ade80', marginRight: '4px', verticalAlign: 'middle' }}></span>Peso</span>
                  <span><span style={{ display: 'inline-block', width: '8px', height: '2px', background: '#f87171', marginRight: '4px', verticalAlign: 'middle' }}></span>Grasa %</span>
                  <span><span style={{ display: 'inline-block', width: '8px', height: '2px', background: '#60a5fa', marginRight: '4px', verticalAlign: 'middle' }}></span>Músculo %</span>
                </div>
              </div>

              {circData.some(d => d.arm_r || d.waist || d.leg_r) && (
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Circunferencias (cm)</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={circData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#555', fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="arm_r" stroke="#4ade80" strokeWidth={2} dot={false} name="Brazo der." />
                      <Line type="monotone" dataKey="waist" stroke="#fbbf24" strokeWidth={2} dot={false} name="Cintura" />
                      <Line type="monotone" dataKey="leg_r" stroke="#a78bfa" strokeWidth={2} dot={false} name="Pierna der." />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Full history table */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Historial completo — Bioimpedancia</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ ...thS, textAlign: 'left' }}>#</th>
                    <th style={thS}>Fecha</th>
                    <th style={thS}>Peso kg</th>
                    <th style={thS}>% Grasa</th>
                    <th style={thS}>Músculo %</th>
                    <th style={thS}>Músculo kg</th>
                    <th style={thS}>% Agua</th>
                    <th style={thS}>IMC</th>
                    <th style={thS}>Gr. Visc.</th>
                    <th style={thS}>Huesos kg</th>
                    <th style={thS}>Obesidad</th>
                    <th style={thS}>Edad corp.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...tdSL, color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{metrics.length - i}</td>
                      <td style={{ ...tdS, color: '#aaa' }}>{m.date}</td>
                      <td style={{ ...tdS, color: '#f0f0f0', fontWeight: 600 }}>{m.weight || '—'}</td>
                      <td style={tdS}>{m.body_fat || '—'}</td>
                      <td style={tdS}>{m.muscle_pct || '—'}</td>
                      <td style={{ ...tdS, color: '#4ade80' }}>{m.muscle_kg || '—'}</td>
                      <td style={tdS}>{m.water_pct || '—'}</td>
                      <td style={tdS}>{m.imc || '—'}</td>
                      <td style={tdS}>{m.fat_visceral || '—'}</td>
                      <td style={tdS}>{m.bones_kg || '—'}</td>
                      <td style={tdS}>{m.obesity_grade || '—'}</td>
                      <td style={tdS}>{m.body_age || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Circunferences table */}
          {metrics.some(m => m.arm_r || m.waist) && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Historial — Circunferencias (cm)</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thS}>Fecha</th>
                      <th style={thS}>Brazo D rel.</th>
                      <th style={thS}>Brazo I rel.</th>
                      <th style={thS}>Brazo D flex.</th>
                      <th style={thS}>Brazo I flex.</th>
                      <th style={thS}>Pierna D</th>
                      <th style={thS}>Pierna I</th>
                      <th style={{ ...thS, color: '#fbbf24' }}>Cintura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...metrics].reverse().filter(m => m.arm_r || m.waist).map((m, i) => (
                      <tr key={m.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ ...tdS, color: '#aaa' }}>{m.date}</td>
                        <td style={tdS}>{m.arm_r || '—'}</td>
                        <td style={tdS}>{m.arm_l || '—'}</td>
                        <td style={tdS}>{m.arm_r_flex || '—'}</td>
                        <td style={tdS}>{m.arm_l_flex || '—'}</td>
                        <td style={tdS}>{m.leg_r || '—'}</td>
                        <td style={tdS}>{m.leg_l || '—'}</td>
                        <td style={{ ...tdS, color: '#fbbf24', fontWeight: 700 }}>{m.waist || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
