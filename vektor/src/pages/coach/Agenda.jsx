import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const TYPES = ['Asesoría','Reunión','Pendiente','Nota','Otro']
const TYPE_COLORS = { 'Asesoría':'#4ade80', 'Reunión':'#60a5fa', 'Pendiente':'#fbbf24', 'Nota':'#a78bfa', 'Otro':'#888' }

function toISO(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function CoachAgenda() {
  const { user } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [athletes, setAthletes] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'Asesoría', athlete_id: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1 })()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  useEffect(() => { fetchEvents(); fetchAthletes() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from('coach_events').select('*, profiles(name)').eq('coach_id', user.id).order('date')
    setEvents(data || [])
  }

  async function fetchAthletes() {
    const { data } = await supabase.from('profiles').select('id,name').eq('role','athlete').order('name')
    setAthletes(data || [])
  }

  function openDay(dateStr) {
    setSelectedDate(dateStr)
    setForm({ title: '', type: 'Asesoría', athlete_id: '', note: '' })
    setEditingEvent(null)
    setShowModal(true)
  }

  function editEvent(e) {
    setEditingEvent(e)
    setForm({ title: e.title, type: e.type, athlete_id: e.athlete_id || '', note: e.note || '' })
    setSelectedDate(e.date)
    setShowModal(true)
  }

  async function saveEvent() {
    if (!form.title) return
    setSaving(true)
    if (editingEvent) {
      await supabase.from('coach_events').update({
        title: form.title, type: form.type,
        athlete_id: form.athlete_id || null, note: form.note
      }).eq('id', editingEvent.id)
    } else {
      await supabase.from('coach_events').insert({
        coach_id: user.id, date: selectedDate,
        title: form.title, type: form.type,
        athlete_id: form.athlete_id || null, note: form.note
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchEvents()
  }

  async function deleteEvent(id) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('coach_events').delete().eq('id', id)
    fetchEvents()
  }

  function eventsForDate(dateStr) {
    return events.filter(e => e.date === dateStr)
  }

  const dayEvents = selectedDate ? eventsForDate(selectedDate) : []

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span className="stitle">Agenda personal</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn sm" onClick={() => setMonthDate(new Date(year, month - 1, 1))}>←</button>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f0', padding: '0 8px', lineHeight: '30px' }}>{MONTHS[month]} {year}</span>
          <button className="btn sm" onClick={() => setMonthDate(new Date(year, month + 1, 1))}>→</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '16px' }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDay + 1
          const valid = dayNum >= 1 && dayNum <= daysInMonth
          const dateStr = valid ? toISO(year, month, dayNum) : null
          const isToday = dateStr === today
          const dayEvs = dateStr ? eventsForDate(dateStr) : []
          return (
            <div
              key={i}
              onClick={() => valid && openDay(dateStr)}
              style={{
                background: !valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.08)' : '#111',
                border: `1px solid ${!valid ? 'transparent' : isToday ? 'rgba(74,222,128,0.4)' : dayEvs.length ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '8px', padding: '6px 4px', minHeight: '56px',
                cursor: valid ? 'pointer' : 'default', transition: 'border-color .15s'
              }}
            >
              {valid && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? '#4ade80' : '#f0f0f0' }}>{dayNum}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '3px' }}>
                    {dayEvs.slice(0, 2).map(e => (
                      <div key={e.id} style={{ fontSize: '9px', background: TYPE_COLORS[e.type] + '22', color: TYPE_COLORS[e.type], borderRadius: '3px', padding: '1px 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvs.length > 2 && <div style={{ fontSize: '9px', color: '#555', textAlign: 'center' }}>+{dayEvs.length - 2}</div>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {TYPES.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#888' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: TYPE_COLORS[t] }} />
            {t}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Próximos eventos</div>
      {events.filter(e => e.date >= today).slice(0, 5).length === 0 && (
        <div className="empty">Sin eventos próximos. Haz clic en cualquier día para agregar uno.</div>
      )}
      {events.filter(e => e.date >= today).slice(0, 5).map(e => (
        <div key={e.id} style={{ background: '#111', border: `1px solid ${TYPE_COLORS[e.type]}33`, borderLeft: `3px solid ${TYPE_COLORS[e.type]}`, borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0f0f0' }}>{e.title}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: TYPE_COLORS[e.type], background: TYPE_COLORS[e.type] + '22', padding: '2px 6px', borderRadius: '4px' }}>{e.type}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              {e.date}{e.profiles?.name ? ` · ${e.profiles.name}` : ''}
            </div>
            {e.note && <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '3px' }}>{e.note}</div>}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button className="btn sm" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => editEvent(e)}>✏️</button>
            <button className="btn danger sm" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => deleteEvent(e.id)}>×</button>
          </div>
        </div>
      ))}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}>{editingEvent ? 'Editar evento' : `Nuevo evento — ${selectedDate}`}</h3>
            </div>

            {/* Existing events for this day */}
            {!editingEvent && dayEvents.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: '6px' }}>Eventos de este día</div>
                {dayEvents.map(e => (
                  <div key={e.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0f0f0' }}>{e.title}</span>
                      <span style={{ fontSize: '10px', color: TYPE_COLORS[e.type], marginLeft: '6px' }}>{e.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => editEvent(e)}>✏️</button>
                      <button className="btn danger sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => { deleteEvent(e.id); setShowModal(false) }}>×</button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '10px 0' }} />
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: '8px' }}>Agregar otro evento</div>
              </div>
            )}

            <div className="field">
              <label>Título</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Asesoría nutricional, Reunión de equipo..." />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Atleta relacionado (opcional)</label>
              <select value={form.athlete_id} onChange={e => setForm({ ...form, athlete_id: e.target.value })}>
                <option value="">— Ninguno —</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Nota (opcional)</label>
              <textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Detalles adicionales..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={saveEvent} disabled={saving}>{saving ? 'Guardando...' : editingEvent ? 'Guardar cambios' : 'Agregar evento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
