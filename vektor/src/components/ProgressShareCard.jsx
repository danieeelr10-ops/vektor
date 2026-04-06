import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtDate(d) {
  const [y, m] = d.split('-')
  return `${MONTHS_ES[parseInt(m)-1]} ${y}`
}

function SparkLine({ data, color = '#4ade80', width = 260, height = 80 }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => parseFloat(d))
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const pad = 8
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (width - pad * 2)
    const y = pad + ((max - v) / range) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const lastX = pad + ((vals.length - 1) / (vals.length - 1)) * (width - pad * 2)
  const lastY = pad + ((max - vals[vals.length - 1]) / range) * (height - pad * 2)
  const areaClose = `${lastX},${height} ${pad},${height}`

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${height} ${pts} ${areaClose}`} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((_, i) => {
        const x = pad + (i / (vals.length - 1)) * (width - pad * 2)
        const y = pad + ((max - vals[i]) / range) * (height - pad * 2)
        return <circle key={i} cx={x} cy={y} r={i === vals.length - 1 ? 5 : 3} fill={color} opacity={i === vals.length - 1 ? 1 : 0.4} />
      })}
    </svg>
  )
}

function DeltaBadge({ value, unit, invert = false }) {
  if (value == null) return null
  const good = invert ? value > 0 : value < 0
  const neutral = Math.abs(value) < 0.05
  const color = neutral ? '#555' : good ? '#4ade80' : '#f87171'
  const bg = neutral ? 'rgba(255,255,255,0.05)' : good ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'
  const prefix = value > 0 ? '+' : ''
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: '3px 9px', fontSize: 13, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-.02em' }}>
      {prefix}{value.toFixed(1)} {unit}
    </span>
  )
}

export default function ProgressShareCard({ metrics, athleteName }) {
  const cardRef = useRef(null)
  const [generating, setGenerating] = useState(false)

  if (!metrics || metrics.length < 2) return null

  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0], last = sorted[sorted.length - 1]

  const d = (k) => {
    const a = parseFloat(first[k]), b = parseFloat(last[k])
    return isNaN(a) || isNaN(b) ? null : b - a
  }

  const months = Math.round((new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24 * 30))

  const weightData  = sorted.map(m => m.weight).filter(Boolean)
  const fatData     = sorted.map(m => m.body_fat).filter(Boolean)
  const muscleData  = sorted.map(m => m.muscle_kg).filter(Boolean)

  async function download() {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 100))
    const canvas = await html2canvas(cardRef.current, {
      scale: 2, useCORS: true, backgroundColor: null,
      width: 1080, height: 1080,
    })
    const link = document.createElement('a')
    link.download = `vektor-${(athleteName || 'progreso').toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setGenerating(false)
  }

  const Card = () => (
    <div ref={cardRef} style={{
      width: 1080, height: 1080, boxSizing: 'border-box',
      background: '#090909',
      fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
      display: 'flex', flexDirection: 'column',
      padding: '56px 64px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(74,222,128,0.07) 0%, transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-200, right:-200, width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 60%)', pointerEvents:'none' }} />

      {/* TOP BAR */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 52 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'10px 18px', display:'flex', alignItems:'center' }}>
            <img src="/logo-rd.png" alt="Rendimiento Deportivo" style={{ height:100, width:'auto', display:'block' }} crossOrigin="anonymous" />
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:13, color:'#333', marginBottom:2 }}>@vektor.training</div>
          <div style={{ fontSize:11, color:'#2a2a2a' }}>vektor.training</div>
        </div>
      </div>

      {/* ATHLETE + PERIOD */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 10 }}>
          {athleteName || 'Progreso'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ height:1, width:32, background:'rgba(74,222,128,0.5)' }} />
          <div style={{ fontSize:14, color:'#4ade80', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>
            {months} {months === 1 ? 'mes' : 'meses'} de transformación
          </div>
          <div style={{ fontSize:14, color:'#333' }}>·</div>
          <div style={{ fontSize:14, color:'#555' }}>{fmtDate(first.date)} → {fmtDate(last.date)}</div>
        </div>
      </div>

      {/* MAIN METRICS ROW */}
      <div style={{ display:'flex', gap:20, marginBottom:32 }}>

        {/* Peso hero */}
        <div style={{ flex:'0 0 300px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'28px 28px 20px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:16 }}>Peso corporal</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:'#333', marginBottom:4 }}>Inicio</div>
              <div style={{ fontSize:26, fontWeight:700, color:'#555', fontFamily:'monospace' }}>{parseFloat(first.weight).toFixed(1)}<span style={{ fontSize:13, color:'#333', marginLeft:3 }}>kg</span></div>
            </div>
            <div style={{ fontSize:18, color:'#2a2a2a', marginBottom:6 }}>→</div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#555', marginBottom:4 }}>Hoy</div>
              <div style={{ fontSize:36, fontWeight:900, color:'#fff', fontFamily:'monospace', lineHeight:1 }}>{parseFloat(last.weight).toFixed(1)}<span style={{ fontSize:14, color:'#666', marginLeft:3 }}>kg</span></div>
            </div>
          </div>
          {d('weight') != null && <DeltaBadge value={d('weight')} unit="kg" invert={false} />}
        </div>

        {/* Gráfica peso */}
        <div style={{ flex:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px 24px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Evolución del peso</div>
          <SparkLine data={weightData} color="#4ade80" width={380} height={100} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            {sorted.map((m, i) => (
              <div key={i} style={{ fontSize:10, color:'#333', textAlign:'center' }}>{fmtDate(m.date).split(' ')[0]}</div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:32 }}>
        {[
          { label:'% Grasa corporal', key:'body_fat', unit:'%', data:fatData, color:'#f87171', invert:false },
          { label:'Músculo esquelético', key:'muscle_kg', unit:'kg', data:muscleData, color:'#60a5fa', invert:true },
          { label:'Masa grasa', key:'fat_kg', unit:'kg', data:sorted.map(m=>m.fat_kg).filter(Boolean), color:'#fbbf24', invert:false },
        ].map(({ label, key, unit, data, color, invert }) => (
          <div key={key} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'20px 20px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>{label}</div>
            <SparkLine data={data} color={color} width={260} height={56} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:12 }}>
              <div>
                <div style={{ fontSize:10, color:'#333' }}>Inicio</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#555', fontFamily:'monospace' }}>{parseFloat(first[key])?.toFixed(1) || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#555', textAlign:'right' }}>Hoy</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', fontFamily:'monospace' }}>{parseFloat(last[key])?.toFixed(1) || '—'}<span style={{ fontSize:11, color:'#555', marginLeft:2 }}>{unit}</span></div>
              </div>
            </div>
            <div style={{ marginTop:8 }}>
              {d(key) != null && <DeltaBadge value={d(key)} unit={unit} invert={invert} />}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize:12, color:'#333', fontWeight:600 }}>Resultados con seguimiento profesional de composición corporal</div>
        <div style={{ background:'#fff', borderRadius:10, padding:'5px 10px' }}>
          <img src="/logo-rd.png" alt="Rendimiento Deportivo" style={{ height:40, width:'auto', display:'block' }} crossOrigin="anonymous" />
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ position:'fixed', left:'-9999px', top:0, zIndex:-1 }}>
        <Card />
      </div>
      <button onClick={download} disabled={generating} style={{
        width:'100%', padding:'11px', marginTop:'14px',
        borderRadius:'10px', border:'1px solid rgba(96,165,250,0.3)',
        background: generating ? 'transparent' : 'rgba(96,165,250,0.08)',
        color:'#60a5fa', fontSize:'12px', fontWeight:700,
        cursor: generating ? 'wait' : 'pointer', fontFamily:'inherit',
        display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'
      }}>
        {generating ? '⏳ Generando imagen...' : '📸 Descargar para Instagram'}
      </button>
    </div>
  )
}
