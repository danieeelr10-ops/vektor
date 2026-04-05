import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { user_id, athlete_name } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: records } = await supabase
      .from('metrics')
      .select('date,weight,body_fat,fat_kg,muscle_kg,lean_mass_kg,fat_free_kg,water_l,imc')
      .eq('user_id', user_id)
      .order('date', { ascending: true })

    if (!records?.length) throw new Error('Sin mediciones')

    const lines = records.map(m => {
      const parts = [`Fecha: ${m.date}`]
      if (m.weight     != null) parts.push(`Peso: ${m.weight} kg`)
      if (m.body_fat   != null) parts.push(`Grasa: ${m.body_fat}%`)
      if (m.fat_kg     != null) parts.push(`Masa grasa: ${m.fat_kg} kg`)
      if (m.muscle_kg  != null) parts.push(`Músculo: ${m.muscle_kg} kg`)
      if (m.lean_mass_kg  != null) parts.push(`Masa magra: ${m.lean_mass_kg} kg`)
      if (m.fat_free_kg   != null) parts.push(`Libre de grasa: ${m.fat_free_kg} kg`)
      if (m.imc        != null) parts.push(`IMC: ${m.imc}`)
      return parts.join(' | ')
    })

    const name = athlete_name || 'el atleta'
    const prompt = `Eres un coach de fitness profesional. Analiza la evolución de composición corporal de ${name} y escribe UN párrafo de 3 a 4 oraciones en español, sin tecnicismos, que resuma el progreso general, las tendencias más importantes y una recomendación concreta. Sé directo y motivador.

Historial de mediciones (cronológico):
${lines.join('\n')}

Escribe solo el párrafo, nada más.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })

    const analysis = (response.content[0] as { type: string; text: string }).text.trim()

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
