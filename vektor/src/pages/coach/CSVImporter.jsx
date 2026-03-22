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

function parseCalendarCSV(text) {
  const lines = text.split('\n').map(l => l.split(','))
  const sessions = []
  let currentYear = null
  let currentMonth = null

  lines.forEach((cols, lineIdx) => {
    // Detect month header like "ENERO  2026"
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

    // Skip header rows (LUN, MAR, etc.)
    if (cols.some(c => c.trim().toUpperCase() === 'LUN')) return

    // Parse day cells: "1  Fuerza T.S." or "15" (empty)
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

export default function CSVImporter() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('profiles').select('id,name').eq('role','athlete').order('name')
      .then(({ data }) => {
        setAthletes(data || [])
        if (data?.length) setSelectedAthlete(data[0].id)
      })
  }, [])

  function handleFile(e) {
    setError('')
    setPreview(null)
    setDone(false)
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const text = evt.target.result
        const sessions = parseCalendarCSV(text)
        if (!sessions.length) {
          setError('No se encontraron sesiones en el archivo. Verifica que el formato sea correcto.')
          return
        }
        setPreview(sessions)
      } catch (err) {
        setError('Error al procesar el archivo: ' + err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function importSessions() {
    if (!preview || !selectedAthlete) return
    setImporting(true)
    const rows = preview.map(s => ({
      coach_id: user.id,
      athlete_id: selectedAthlete,
      routine_id: null,
      date: s.date,
      notes: s.notes,
      completed: s.notes !== 'Descanso',
      rpe: null,
      duration: null,
    }))

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from('sessions').insert(batch)
      if (error) { setError('Error al importar: ' + error.message); setImporting(false); return }
    }
    setImporting(false)
    setDone(true)
    setPreview(null)
  }

  const sessionTypes = preview ? [...new Set(preview.map(s => s.notes))].sort() : []
  const byType = preview ? sessionTypes.reduce((acc, t) => ({ ...acc, [t]: preview.filter(s => s.notes === t).length }), {}) : {}

  const typeColors = {
    'Fuerza Tren Superior': '#60a5fa',
    'Fuerza Tren Inferior': '#4ade80',
    'Circuitos mixtos': '#fbbf24',
    'Entrenamiento Vittoria': '#a78bfa',
    'Descanso': '#555',
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Atleta</div>
        <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)} style={{ width: '100%' }}>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{ background: '#111', border: '2px dashed rgba(74,222,128,0.2)', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: '14px', transition: 'border-color .15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)'}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '4px' }}>Subir archivo CSV</div>
        <div style={{ fontSize: '12px', color: '#555' }}>Formato: planificación mensual con días y tipo de sesión</div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', color: '#f87171', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {done && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#4ade80' }}>Importación completada</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>El historial ya está visible en el calendario del atleta</div>
        </div>
      )}

      {preview && (
        <div>
          <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
              Vista previa — {preview.length} registros encontrados
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', marginBottom: '12px' }}>
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: typeColors[type] || '#888' }} />
                    <span style={{ fontSize: '12px', color: '#f0f0f0' }}>{type}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: typeColors[type] || '#888', fontFamily: 'monospace' }}>{count}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11px', color: '#555', marginBottom: '12px' }}>
              Período: {preview[0]?.date} → {preview[preview.length-1]?.date}
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#1a1a1a', borderRadius: '8px', marginBottom: '12px' }}>
              {preview.slice(0, 20).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                  <span style={{ color: '#888', fontFamily: 'monospace' }}>{s.date}</span>
                  <span style={{ color: typeColors[s.notes] || '#f0f0f0', fontWeight: 600 }}>{s.notes}</span>
                </div>
              ))}
              {preview.length > 20 && (
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#555', textAlign: 'center' }}>
                  ... y {preview.length - 20} más
                </div>
              )}
            </div>

            <button className="btn primary" style={{ width: '100%' }} onClick={importSessions} disabled={importing}>
              {importing ? `Importando...` : `Importar ${preview.length} registros para ${athletes.find(a=>a.id===selectedAthlete)?.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
