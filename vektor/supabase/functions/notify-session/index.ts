import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { athlete_email, athlete_name, date, scheduled_time, routine_name, notes } = await req.json()

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  const timeStr = scheduled_time ? `<p><strong>Horario:</strong> ${scheduled_time}</p>` : ''
  const notesStr = notes ? `<p><strong>Notas del coach:</strong> ${notes}</p>` : ''
  const routineStr = routine_name ? `<p><strong>Rutina:</strong> ${routine_name}</p>` : ''

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
      <div style="font-size: 22px; font-weight: 800; color: #4ade80; margin-bottom: 8px;">Vektor Training</div>
      <h2 style="font-size: 18px; color: #f0f0f0; margin-bottom: 20px;">Tienes una nueva sesión programada 💪</h2>
      <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p><strong>Hola ${athlete_name},</strong></p>
        <p>Tu coach te ha asignado una sesión de entrenamiento:</p>
        <p><strong>Fecha:</strong> ${date}</p>
        ${timeStr}
        ${routineStr}
        ${notesStr}
      </div>
      <p style="color: #888; font-size: 12px;">Este correo fue enviado automáticamente por Vektor Training.</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vektor Training <onboarding@resend.dev>',
      to: athlete_email,
      subject: `Nueva sesión programada — ${date}`,
      html,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
})
