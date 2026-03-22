import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const SESSION_MAP = {
  'fuerza t.s.': 'Fuerza Tren Superior',
  'fuerza t.i.': 'Fuerza Tren Inferior',
  'circuitos mixtos': 'Circuitos mixtos',
  'vittoria': 'Entrenamiento Vittoria',
  'descanso': 'Descanso',
  'fuerza t.s. + vittoria': 'Fuerza Tren Superior + Vittoria',
  'fuerza t.i. + vittoria': 'Fuerza Tren Inferior + Vittoria',
}

const MONTH_MAP = {
  'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
  'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12
}

function cleanNum(str) {
  if (!str) return null
  const clean = String(str).replace('%','').replace(',','.').trim()
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

// Detect file type
function detectType(text) {
  const lower = text.toLowerCase()
  // Bioimpedance: has bioimpedancia or grasa + imc columns
  if (lower.includes('bioimpedancia') || (lower.includes('grasa') && lower.includes('imc') && lower.includes('serie'))) return 'bio'
  // Session calendar: has month names + day-of-week headers
  if ((lower.includes('lun') && lower.includes('mar')) || (lower.includes('enero') && lower.includes('fuerza'))) return 'sessions'
  // Circumferences
  if (lower.includes('circunferencia') || (lower.includes('brazo') && lower.includes('cintura'))) return 'circ'
  // Routine: has EJERCICIO + SERIES + REPETICIONES headers OR has sesion/session pattern
  if (lower.includes('ejercicio') && lower.includes('series') && lower.includes('repeticiones')) return 'routine'
  if (lower.includes('rutina') && lower.includes('series')) return 'routine'
  // Also detect by SESI pattern (handles accent encoding issues)
  if (lower.includes('sesi') && lower.includes('ejercicio')) return 'routine'
  return 'unknown'
}

function parseRoutineCSV(text) {
  const lines = text.split('\n').map(l => l.split(','))
  const routines = []
  let currentRoutine = null

  lines.forEach(cols => {
    const c1 = (cols[1] || '').trim()
    if (!c1) return

    // Detect session header: "SESIÓN 1 — Pecho + Espalda"
    const sessionMatch = c1.match(/SESI[OÓ]N\s*\d+\s*[—–-]+\s*(.+)/i)
    if (sessionMatch) {
      if (currentRoutine) routines.push(currentRoutine)
      currentRoutine = { name: sessionMatch[1].trim(), exercises: [] }
      return
    }

    // Skip header rows
    if (c1.toUpperCase() === 'EJERCICIO') return
    // Skip rest/timing rows
    if (c1.startsWith('⏱') || c1.startsWith('Descanso')) return

    if (!currentRoutine) return

    const exercise = c1
    const direction = (cols[2] || '').trim()
    const seriesCount = parseInt(cols[3]) || 1
    const repsStr = (cols[4] || '').trim()
    const obs = (cols[5] || '').trim()

    if (!exercise || exercise.toLowerCase() === 'rutina') return

    // Parse reps: "12/12/10/10" or "10-10-10" or "10 x brazo"
    let repsList = []
    if (repsStr.includes('/')) repsList = repsStr.split('/').map(r => r.trim())
    else if (repsStr.includes('-')) repsList = repsStr.split('-').map(r => r.trim())
    else repsList = Array(seriesCount).fill(repsStr)

    // Build series array
    const series = Array.from({ length: seriesCount }, (_, i) => ({
      reps: repsList[i] || repsList[0] || '',
      weight: ''
    }))

    currentRoutine.exercises.push({
      name: exercise,
      note: [direction, obs].filter(Boolean).join(' · ') || '',
      series
    })
  })

  if (currentRoutine) routines.push(currentRoutine)
  return routines
}

function parseSessionsCSV(text) {
  const lines = text.split('\n').map(l => l.split(','))
  const sessions = []
  let currentYear = null
  let currentMonth = null

  lines.forEach(cols => {
    const monthLine = cols.find(c => {
      const clean = c.trim().toLowerCase()
      return Object.keys(MONTH_MAP).some(m => clean.startsWith(m))
    })
    if (monthLine) {
      const clean = monthLine.trim().toLowerCase()
      for (const [month, num] of Object.entries(MONTH_MAP)) {
        if (clean.startsWith(month)) {
          currentMonth = num
          const yearMatch = monthLine.match(/\d{4}/)
          if (yearMatch) currentYear = parseInt(yearMatch[0])
          break
        }
      }
      return
    }
    if (!currentMonth || !currentYear) return
    if (cols.some(c => c.trim().toUpperCase() === 'LUN')) return
    cols.forEach(cell => {
      const clean = cell.trim()
      if (!clean) return
      const dayMatch = clean.match(/^(\d{1,2})\s+(.+)$/)
      if (!dayMatch) return
      const day = parseInt(dayMatch[1])
      const sessionText = dayMatch[2].trim()
      const sessionKey = sessionText.toLowerCase()
      const sessionName = SESSION_MAP[sessionKey] || sessionText
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      sessions.push({ date: dateStr, notes: sessionName, sessionText })
    })
  })
  return sessions
}

function parseBioCSV(text) {
  const lines = text.split('\n').map(l => l.split(','))
  const records = []

  // Find data rows: look for rows where col 1 is a number (serie)
  lines.forEach(cols => {
    const serie = parseInt(cols[1])
    if (isNaN(serie) || serie < 1) return
    // Col layout: ,SERIE,PESO,GRASA%,MUSCULOS_KG,%AGUA,IMC,GRASA_VISC,HUESOS,GRADO_OB,EDAD_CUERPO
    const record = {
      serie,
      weight: cleanNum(cols[2]),
      body_fat: cleanNum(cols[3]),
      muscle_kg: cleanNum(cols[4]),
      water_pct: cleanNum(cols[5]),
      imc: cleanNum(cols[6]),
      fat_visceral: cleanNum(cols[7]),
      bones_kg: cleanNum(cols[8]),
      obesity_grade: cleanNum(cols[9]),
      body_age: cleanNum(cols[10]),
    }
    // Calculate muscle_pct from muscle_kg and weight if available
    if (record.muscle_kg && record.weight) {
      record.muscle_pct = parseFloat(((record.muscle_kg / record.weight) * 100).toFixed(1))
    }
    if (record.weight) records.push(record)
  })
  return records
}

function parseCircCSV(text) {
  const lines = text.split('\n').map(l => l.split(','))
  const records = []
  lines.forEach(cols => {
    const serie = parseInt(cols[1])
    if (isNaN(serie) || serie < 1) return
    records.push({
      serie,
      arm_r: cleanNum(cols[2]),
      arm_l: cleanNum(cols[3]),
      arm_r_flex: cleanNum(cols[4]),
      arm_l_flex: cleanNum(cols[5]),
      leg_r: cleanNum(cols[6]),
      leg_l: cleanNum(cols[7]),
      waist: cleanNum(cols[8]),
    })
  })
  return records
}

const TYPE_COLORS = {
  'Fuerza Tren Superior':'#60a5fa','Fuerza Tren Inferior':'#4ade80',
  'Circuitos mixtos':'#fbbf24','Entrenamiento Vittoria':'#a78bfa','Descanso':'#555'
}

export default function CSVImporter() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [files, setFiles] = useState([]) // [{name, type, data}]
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')
  const [baseDate, setBaseDate] = useState('2025-01-01')
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('profiles').select('id,name').eq('role','athlete').order('name')
      .then(({ data }) => { setAthletes(data||[]); if (data?.length) setSelectedAthlete(data[0].id) })
  }, [])

  function handleFiles(e) {
    setError(''); setDone(null); setFiles([])
    const newFiles = []
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = evt => {
        const text = evt.target.result
        const type = detectType(text)
        let data = null
        if (type === 'sessions') data = parseSessionsCSV(text)
        else if (type === 'bio') data = parseBioCSV(text)
        else if (type === 'circ') data = parseCircCSV(text)
        else if (type === 'routine') data = parseRoutineCSV(text)
        if (!data?.length) {
          setError(`No se pudieron leer datos de "${file.name}". Verifica el formato.`)
          return
        }
        setFiles(prev => [...prev, { name: file.name, type, data }])
      }
      reader.readAsText(file, 'UTF-8')
    })
  }

  // Generate dates for bio/circ: use baseDate + 30 days per serie
  function serieToDate(serie) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + (serie - 1) * 30)
    return d.toISOString().split('T')[0]
  }

  async function importAll() {
    if (!files.length || !selectedAthlete) return
    setImporting(true)
    setError('')
    let totalImported = 0

    for (const file of files) {
      if (file.type === 'sessions') {
        const rows = file.data.map(s => ({
          coach_id: user.id, athlete_id: selectedAthlete,
          routine_id: null, date: s.date, notes: s.notes,
          completed: s.notes !== 'Descanso', rpe: null, duration: null
        }))
        for (let i = 0; i < rows.length; i += 50) {
          const { error: err } = await supabase.from('sessions').insert(rows.slice(i, i+50))
          if (err) { setError('Error sesiones: ' + err.message); setImporting(false); return }
        }
        totalImported += rows.length
      }

      if (file.type === 'bio') {
        // Check if there are circ files to merge
        const circFile = files.find(f => f.type === 'circ')
        const rows = file.data.map(rec => {
          const circRec = circFile?.data.find(c => c.serie === rec.serie) || {}
          return {
            user_id: selectedAthlete,
            date: serieToDate(rec.serie),
            weight: rec.weight, body_fat: rec.body_fat,
            muscle_pct: rec.muscle_pct, muscle_kg: rec.muscle_kg,
            water_pct: rec.water_pct, imc: rec.imc,
            fat_visceral: rec.fat_visceral, bones_kg: rec.bones_kg,
            obesity_grade: rec.obesity_grade, body_age: rec.body_age,
            arm_r: circRec.arm_r || null, arm_l: circRec.arm_l || null,
            arm_r_flex: circRec.arm_r_flex || null, arm_l_flex: circRec.arm_l_flex || null,
            leg_r: circRec.leg_r || null, leg_l: circRec.leg_l || null,
            waist: circRec.waist || null,
            goal: 'Bajar peso / grasa', note: `Importado — Serie ${rec.serie}`
          }
        })
        const { error: err } = await supabase.from('metrics').insert(rows)
        if (err) { setError('Error métricas: ' + err.message); setImporting(false); return }
        totalImported += rows.length
      }

      if (file.type === 'routine') {
        for (const routine of file.data) {
          const description = routine.exercises.map(ex =>
            ex.series.map((s, si) => `${ex.name} — S${si+1}: ${s.reps||'?'} reps @ ?kg`).join('\n')
          ).join('\n')
          const { error: err } = await supabase.from('routines').insert({
            name: routine.name,
            sport: 'Gym',
            coach_id: user.id,
            description,
            exercises_data: JSON.stringify(routine.exercises)
          })
          if (err) { setError('Error rutina: ' + err.message); setImporting(false); return }
        }
        totalImported += file.data.length
      }

      if (file.type === 'circ' && !files.find(f => f.type === 'bio')) {
        const rows = file.data.map(rec => ({
          user_id: selectedAthlete,
          date: serieToDate(rec.serie),
          arm_r: rec.arm_r, arm_l: rec.arm_l,
          arm_r_flex: rec.arm_r_flex, arm_l_flex: rec.arm_l_flex,
          leg_r: rec.leg_r, leg_l: rec.leg_l, waist: rec.waist,
          note: `Importado — Serie ${rec.serie}`
        }))
        const { error: err } = await supabase.from('metrics').insert(rows)
        if (err) { setError('Error circunferencias: ' + err.message); setImporting(false); return }
        totalImported += rows.length
      }
    }

    setImporting(false)
    setDone(totalImported)
    setFiles([])
  }

  const athlete = athletes.find(a => a.id === selectedAthlete)

  return (
    <div className="fade-in">
      <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Importador de historial</div>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
          Soporta 4 tipos: <strong style={{ color: '#f0f0f0' }}>Planificación</strong> (calendario mensual), <strong style={{ color: '#f0f0f0' }}>Bioimpedancia</strong>, <strong style={{ color: '#f0f0f0' }}>Circunferencias</strong> y <strong style={{ color: '#f0f0f0' }}>Rutinas</strong>. Puedes subir varios a la vez.
        </div>
      </div>

      {/* Athlete */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Atleta</div>
        <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)} style={{ width: '100%' }}>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Base date for bio/circ */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Fecha de primera medición (para bioimpedancia)</div>
        <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)} style={{ width: '100%' }} />
        <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>La app asignará ~30 días entre cada serie de bioimpedancia.</div>
      </div>

      {/* File drop zone */}
      <div onClick={() => fileRef.current?.click()}
        style={{ background: '#111', border: '2px dashed rgba(74,222,128,0.2)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: '14px' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)'}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '4px' }}>Subir archivos CSV</div>
        <div style={{ fontSize: '12px', color: '#555' }}>Puedes subir múltiples archivos a la vez</div>
        <input ref={fileRef} type="file" accept=".csv" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', color: '#f87171', fontSize: '13px' }}>{error}</div>
      )}

      {done !== null && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#4ade80' }}>Importación completada</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{done} registros importados para {athlete?.name}</div>
        </div>
      )}

      {/* Files preview */}
      {files.map((file, fi) => (
        <div key={fi} style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0f0f0' }}>{file.name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                {file.type === 'sessions' ? '📅 Planificación de sesiones' : file.type === 'bio' ? '⚖️ Bioimpedancia' : file.type === 'circ' ? '📏 Circunferencias' : '💪 Rutina de entrenamiento'}
                {' · '}{file.data.length} registros
              </div>
            </div>
            <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>Listo</span>
          </div>

          {file.type === 'sessions' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                {Object.entries(
                  file.data.reduce((acc, s) => ({ ...acc, [s.notes]: (acc[s.notes]||0)+1 }), {})
                ).map(([type, count]) => (
                  <div key={type} style={{ background: '#1a1a1a', borderRadius: '7px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: TYPE_COLORS[type]||'#888' }} />
                      <span style={{ fontSize: '11px', color: '#f0f0f0' }}>{type}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: TYPE_COLORS[type]||'#888', fontFamily: 'monospace' }}>{count}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#555' }}>Período: {file.data[0]?.date} → {file.data[file.data.length-1]?.date}</div>
            </>
          )}

          {file.type === 'routine' && (
            <div>
              {file.data.map((r, ri) => (
                <div key={ri} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px 12px', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#f0f0f0', marginBottom: '4px' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{r.exercises.length} ejercicios · {r.exercises.reduce((a,ex)=>a+ex.series.length,0)} series totales</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                    {r.exercises.map((ex, ei) => (
                      <span key={ei} style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '5px', padding: '2px 7px', fontSize: '10px', color: '#4ade80' }}>{ex.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {file.type === 'bio' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    {['Serie','Fecha','Peso','Grasa%','Músculo kg','IMC'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', background: '#1a1a1a', color: '#555', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {file.data.map(r => (
                    <tr key={r.serie} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '5px 8px', color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>{r.serie}</td>
                      <td style={{ padding: '5px 8px', color: '#888', fontFamily: 'monospace', fontSize: '10px' }}>{serieToDate(r.serie)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>{r.weight}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{r.body_fat}%</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#4ade80' }}>{r.muscle_kg}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{r.imc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {files.length > 0 && (
        <button className="btn primary" style={{ width: '100%' }} onClick={importAll} disabled={importing}>
          {importing ? 'Importando...' : `Importar todo para ${athlete?.name} →`}
        </button>
      )}
    </div>
  )
}
