import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { metric_id, user_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener medición actual y la anterior
    const { data: records } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(2)

    if (!records?.length) throw new Error('No metrics found')

    const current = records[0]
    const previous = records[1] || null

    const fmt = (v: any, unit: string) => v != null ? `${v} ${unit}` : null

    const currentStr = [
      fmt(current.weight, 'kg de peso'),
      fmt(current.body_fat, '% grasa corporal'),
      fmt(current.muscle_kg, 'kg de músculo esquelético'),
      fmt(current.fat_kg, 'kg de masa grasa'),
      fmt(current.lean_mass_kg, 'kg de masa corporal magra'),
      fmt(current.fat_free_kg, 'kg de masa libre de grasa'),
      fmt(current.water_l, 'L de agua corporal'),
      fmt(current.imc, 'de IMC'),
    ].filter(Boolean).join(', ')

    let prevStr = ''
    if (previous) {
      const diffs = []
      if (current.weight != null && previous.weight != null) {
        const d = (parseFloat(current.weight) - parseFloat(previous.weight)).toFixed(1)
        diffs.push(`peso ${d > '0' ? '+' : ''}${d} kg`)
      }
      if (current.body_fat != null && previous.body_fat != null) {
        const d = (parseFloat(current.body_fat) - parseFloat(previous.body_fat)).toFixed(1)
        diffs.push(`grasa ${d > '0' ? '+' : ''}${d}%`)
      }
      if (current.muscle_kg != null && previous.muscle_kg != null) {
        const d = (parseFloat(current.muscle_kg) - parseFloat(previous.muscle_kg)).toFixed(1)
        diffs.push(`músculo ${d > '0' ? '+' : ''}${d} kg`)
      }
      if (current.fat_free_kg != null && previous.fat_free_kg != null) {
        const d = (parseFloat(current.fat_free_kg) - parseFloat(previous.fat_free_kg)).toFixed(1)
        diffs.push(`masa libre de grasa ${d > '0' ? '+' : ''}${d} kg`)
      }
      prevStr = diffs.length ? `Cambios desde la medición anterior (${previous.date}): ${diffs.join(', ')}.` : ''
    }

    const prompt = `Eres un coach de fitness profesional. Analiza estos datos de composición corporal de un atleta y escribe UN párrafo corto (máximo 3 oraciones) en español, sin tecnicismos, que explique el estado actual y la tendencia. Sé directo, positivo pero honesto. No uses viñetas ni listas.

Medición actual (${current.date}): ${currentStr}.
${prevStr}

Escribe solo el párrafo de análisis, nada más.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    const analysis = (response.content[0] as { type: string; text: string }).text.trim()

    // Guardar en la DB
    await supabase.from('metrics').update({ ai_analysis: analysis }).eq('id', metric_id)

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
