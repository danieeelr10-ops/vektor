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
            text: `Analiza esta imagen de una báscula de composición corporal e identifica los valores numéricos mostrados en pantalla.

Devuelve ÚNICAMENTE un objeto JSON con los campos que puedas identificar (omite los que no aparezcan en la imagen):

{
  "weight": <peso en kg como número>,
  "imc": <IMC/BMI como número>,
  "body_fat": <% grasa corporal como número>,
  "fat_kg": <masa grasa en kg como número>,
  "muscle_kg": <masa muscular esquelética en kg como número>,
  "protein_kg": <proteína en kg como número>,
  "bones_kg": <masa ósea o minerales en kg como número>,
  "water_l": <agua corporal en litros como número>,
  "lean_mass_kg": <masa magra en kg como número>
}

Si un valor está en libras (lbs), conviértelo a kg. Devuelve SOLO el JSON válido, sin texto adicional ni markdown.`
          }
        ]
      }]
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    // Extraer JSON aunque venga envuelto en ```
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

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
