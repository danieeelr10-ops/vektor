import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { image_base64, mime_type } = await req.json()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mime_type || 'image/jpeg', data: image_base64 }
          },
          {
            type: 'text',
            text: `Eres un extractor de datos de básculas de composición corporal (InBody o similar).
Analiza esta imagen y extrae los valores numéricos. Devuelve ÚNICAMENTE un JSON con estos campos exactos (omite los que no puedas leer con certeza):

{
  "weight": <Peso en Kg>,
  "water_l": <Total de agua corporal en L>,
  "protein_kg": <Proteína en Kg>,
  "bones_kg": <Minerales en Kg>,
  "fat_kg": <Masa de grasa corporal en Kg>,
  "lean_mass_kg": <Masa corporal magra en Kg>,
  "fat_free_kg": <Masa libre de grasa en Kg>,
  "muscle_kg": <MME / Masa muscular esquelética en Kg>,
  "imc": <IMC / Índice de masa corporal en Kg/m²>,
  "body_fat": <PGC / Porcentaje de grasa corporal en %>
}

Reglas:
- Usa solo los valores principales (no los rangos de referencia entre paréntesis)
- Si un valor está en libras conviértelo a kg
- Devuelve SOLO el JSON válido, sin texto ni markdown`
          }
        ]
      }]
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const metrics = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ ok: true, metrics }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
