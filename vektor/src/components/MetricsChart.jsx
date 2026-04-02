import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'

const COMP_FIELDS = [
  ['weight',      'Peso',              'kg'],
  ['muscle_kg',   'Masa muscular',     'kg'],
  ['body_fat',    '% Grasa',           '%'],
  ['fat_kg',      'Masa grasa',        'kg'],
  ['protein_kg',  'Proteína',          'kg'],
  ['bones_kg',    'Minerales',         'kg'],
  ['water_l',     'Agua',              'L'],
  ['lean_mass_kg','Masa magra',        'kg'],
  ['imc',         'IMC',               'kg/m²'],
]

const CIRC_FIELDS = [
  ['arm_r',  'Brazo der.',  'cm'],
  ['arm_l',  'Brazo izq.',  'cm'],
  ['leg_r',  'Pierna der.', 'cm'],
  ['leg_l',  'Pierna izq.', 'cm'],
  ['waist',  'Cintura',     'cm'],
]

const ALL_FIELDS = [...COMP_FIELDS, ...CIRC_FIELDS]

function isCirc(key) { return CIRC_FIELDS.some(([k]) => k === key) }

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div style={{ background:'#1a1a1a', border:'1px solid rgba(74,222,128,0.3)', borderRadius:'8px', padding:'10px 14px', pointerEvents:'none' }}>
      <div style={{ fontSize:'11px', color:'#777', marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'20px', fontWeight:800, color: isCirc(payload[0]?.name) ? '#60a5fa' : '#4ade80', fontFamily:'monospace', lineHeight:1 }}>
        {val != null ? Number(val).toFixed(1) : '—'}
        <span style={{ fontSize:'11px', fontWeight:400, color:'#666', marginLeft:'4px' }}>{unit}</span>
      </div>
    </div>
  )
}

export default function MetricsChart({ metrics }) {
  const [selectedField, setSelectedField] = useState('weight')

  // ordenar ascendente por fecha
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date))

  const fieldMeta = ALL_FIELDS.find(([k]) => k === selectedField) || ALL_FIELDS[0]
  const color = isCirc(selectedField) ? '#60a5fa' : '#4ade80'

  const chartData = sorted
    .filter(m => m[selectedField] != null)
    .map(m => ({ label: m.date.slice(5), value: parseFloat(m[selectedField]), date: m.date }))

  const vals = chartData.map(d => d.value)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  const first = vals[0]
  const last = vals[vals.length - 1]
  const delta = vals.length >= 2 ? last - first : null
  const deltaPct = first && delta != null ? delta / first * 100 : null

  if (metrics.length < 2) return null

  return (
    <div>
      {/* Selector composición */}
      <div style={{ marginBottom:'8px' }}>
        <div style={{ fontSize:'9px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Composición</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'10px' }}>
          {COMP_FIELDS.map(([k, lbl]) => (
            <button key={k} onClick={() => setSelectedField(k)} style={{
              padding:'4px 9px', borderRadius:'20px', border:'1px solid',
              borderColor: selectedField===k ? '#4ade80' : 'rgba(255,255,255,0.08)',
              background: selectedField===k ? 'rgba(74,222,128,0.1)' : 'transparent',
              color: selectedField===k ? '#4ade80' : '#666',
              fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .12s'
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ fontSize:'9px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Circunferencias</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {CIRC_FIELDS.map(([k, lbl]) => (
            <button key={k} onClick={() => setSelectedField(k)} style={{
              padding:'4px 9px', borderRadius:'20px', border:'1px solid',
              borderColor: selectedField===k ? '#60a5fa' : 'rgba(255,255,255,0.08)',
              background: selectedField===k ? 'rgba(96,165,250,0.1)' : 'transparent',
              color: selectedField===k ? '#60a5fa' : '#666',
              fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .12s'
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {chartData.length < 2 ? (
        <div style={{ textAlign:'center', color:'#555', fontSize:'12px', padding:'20px 0' }}>Sin datos suficientes para "{fieldMeta[1]}"</div>
      ) : (
        <>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', margin:'16px 0 8px' }}>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#ddd' }}>{fieldMeta[1]}</div>
              <div style={{ fontSize:'10px', color:'#555' }}>{chartData.length} mediciones</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'26px', fontWeight:800, color, fontFamily:'monospace', lineHeight:1 }}>{last?.toFixed(1)}</div>
              <div style={{ fontSize:'10px', color:'#555' }}>{fieldMeta[2]}</div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height:'180px', marginLeft:'-4px', marginRight:'-4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top:6, right:12, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id={`grad-${selectedField}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize:9, fill:'#555', fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} tick={{ fontSize:9, fill:'#555', fontFamily:'monospace' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip unit={fieldMeta[2]} />} />
                <ReferenceLine y={avg} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4"
                  label={{ value:`${avg.toFixed(1)}`, position:'insideTopRight', fontSize:8, fill:'#444' }} />
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                  fill={`url(#grad-${selectedField})`}
                  dot={{ r:3.5, fill:color, strokeWidth:0 }}
                  activeDot={{ r:5, strokeWidth:0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginTop:'12px' }}>
            {[
              { lbl:'Inicio', val: first?.toFixed(1), u: fieldMeta[2] },
              { lbl:'Actual', val: last?.toFixed(1),  u: fieldMeta[2] },
              { lbl:'Cambio', val: delta != null ? `${delta>0?'+':''}${delta.toFixed(1)}` : '—', u: delta!=null ? fieldMeta[2] : '',
                col: delta==null ? '#555' : delta<0 ? '#4ade80' : delta>0 ? '#f87171' : '#555' },
              { lbl:'Prom.', val: avg.toFixed(1), u: fieldMeta[2] },
            ].map(s => (
              <div key={s.lbl} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'7px', padding:'8px 6px', textAlign:'center' }}>
                <div style={{ fontSize:'9px', fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'3px' }}>{s.lbl}</div>
                <div style={{ fontSize:'13px', fontWeight:800, color: s.col || '#ddd', fontFamily:'monospace' }}>{s.val}</div>
                <div style={{ fontSize:'8px', color:'#444' }}>{s.u}</div>
              </div>
            ))}
          </div>

          {/* % badge */}
          {deltaPct != null && (
            <div style={{ textAlign:'center', marginTop:'8px' }}>
              <span style={{
                fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'20px',
                background: Math.abs(deltaPct)<0.01 ? 'rgba(255,255,255,0.05)' : deltaPct<0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                color: Math.abs(deltaPct)<0.01 ? '#555' : deltaPct<0 ? '#4ade80' : '#f87171',
                border: `1px solid ${Math.abs(deltaPct)<0.01?'rgba(255,255,255,0.06)':deltaPct<0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'}`,
              }}>
                {deltaPct>0?'▲':deltaPct<0?'▼':'='} {Math.abs(deltaPct).toFixed(1)}% desde el inicio
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
