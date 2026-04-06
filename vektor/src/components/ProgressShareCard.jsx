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
    <span style={{ background: bg, color, borderRadius: 8, padding: '6px 16px', fontSize: 20, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-.02em' }}>
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
      width: 1080, height: 1920,
    })
    const link = document.createElement('a')
    link.download = `vektor-${(athleteName || 'progreso').toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setGenerating(false)
  }

  const Card = () => (
    <div ref={cardRef} style={{
      width: 1080, height: 1920, boxSizing: 'border-box',
      background: '#090909',
      fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
      display: 'flex', flexDirection: 'column',
      padding: '80px 72px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 100% 40% at 50% 0%, rgba(74,222,128,0.09) 0%, transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-300, left:-200, width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'40%', right:-150, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 60%)', pointerEvents:'none' }} />

      {/* LOGO */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom: 80 }}>
        <div style={{ background:'#fff', borderRadius:28, padding:'24px 48px' }}>
          <img src="/logo-rd.png" alt="Rendimiento Deportivo" style={{ height:200, width:'auto', display:'block' }} crossOrigin="anonymous" />
        </div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign:'center', marginBottom: 72 }}>
        <div style={{ fontSize:28, fontWeight:800, color:'#4ade80', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:24 }}>
          Transformación · {months} {months === 1 ? 'mes' : 'meses'}
        </div>
        <div style={{ fontSize:130, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:.9, marginBottom:28 }}>
          {(athleteName || 'Progreso').split(' ').map((w,i) => <div key={i}>{w}</div>)}
        </div>
        <div style={{ fontSize:30, color:'#555', marginTop:16 }}>{fmtDate(first.date)} → {fmtDate(last.date)}</div>
      </div>

      {/* PESO HERO */}
      <div style={{ background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:36, padding:'60px 68px', marginBottom:40, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'#4ade80', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:20 }}>Peso corporal</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:28 }}>
            <div>
              <div style={{ fontSize:20, color:'#444', marginBottom:8 }}>Inicio</div>
              <div style={{ fontSize:62, fontWeight:700, color:'#555', fontFamily:'monospace' }}>{parseFloat(first.weight).toFixed(1)}<span style={{ fontSize:24, color:'#444', marginLeft:6 }}>kg</span></div>
            </div>
            <div style={{ fontSize:42, color:'#2a2a2a', marginBottom:4 }}>→</div>
            <div>
              <div style={{ fontSize:20, color:'#888', marginBottom:8 }}>Hoy</div>
              <div style={{ fontSize:96, fontWeight:900, color:'#fff', fontFamily:'monospace', lineHeight:1 }}>{parseFloat(last.weight).toFixed(1)}<span style={{ fontSize:28, color:'#666', marginLeft:6 }}>kg</span></div>
            </div>
          </div>
          {d('weight') != null && <div style={{ marginTop:22 }}><DeltaBadge value={d('weight')} unit="kg" invert={false} /></div>}
        </div>
        <SparkLine data={weightData} color="#4ade80" width={300} height={150} />
      </div>

      {/* STATS 2x2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, flex:1 }}>
        {[
          { label:'% Grasa corporal', key:'body_fat', unit:'%', data:fatData, color:'#f87171', invert:false },
          { label:'Músculo esquelético', key:'muscle_kg', unit:'kg', data:muscleData, color:'#60a5fa', invert:true },
          { label:'Masa grasa', key:'fat_kg', unit:'kg', data:sorted.map(m=>m.fat_kg).filter(Boolean), color:'#fbbf24', invert:false },
          { label:'IMC', key:'imc', unit:'', data:sorted.map(m=>m.imc).filter(Boolean), color:'#a78bfa', invert:false },
        ].map(({ label, key, unit, data, color, invert }) => (
          <div key={key} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:28, padding:'40px 36px 32px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div style={{ fontSize:19, fontWeight:800, color:'#555', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:20 }}>{label}</div>
            <SparkLine data={data} color={color} width={390} height={90} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:20 }}>
              <div>
                <div style={{ fontSize:18, color:'#333', marginBottom:6 }}>Inicio</div>
                <div style={{ fontSize:38, fontWeight:700, color:'#555', fontFamily:'monospace' }}>{parseFloat(first[key])?.toFixed(1) || '—'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:18, color:'#555', marginBottom:6 }}>Hoy</div>
                <div style={{ fontSize:58, fontWeight:900, color:'#fff', fontFamily:'monospace', lineHeight:1 }}>{parseFloat(last[key])?.toFixed(1) || '—'}<span style={{ fontSize:20, color:'#555', marginLeft:4 }}>{unit}</span></div>
              </div>
            </div>
            {d(key) != null && <div style={{ marginTop:16 }}><DeltaBadge value={d(key)} unit={unit} invert={invert} /></div>}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:40, marginTop:40, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize:22, color:'#2a2a2a', fontWeight:600 }}>Seguimiento profesional de composición corporal</div>
        <div style={{ background:'#fff', borderRadius:16, padding:'10px 20px' }}>
          <img src="/logo-rd.png" alt="Rendimiento Deportivo" style={{ height:70, width:'auto', display:'block' }} crossOrigin="anonymous" />
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
