const GROQ_API_URL = 'https://api.groq.com/v1/chat/completions';

function buildPrompt(question, notes) {
  const notesText = Array.isArray(notes) && notes.length > 0
    ? notes.map((note, index) => `${index + 1}. ${note.title} (${note.tag}): ${note.description}`).join('\n')
    : 'No hay notas disponibles.';

  return `Usa estas notas para responder la pregunta en español. Mantén la respuesta corta y clara. Si la pregunta no puede responderse con las notas, indica que no tienes suficiente información.\n\nNotas:\n${notesText}\n\nPregunta:\n${question}`;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, notes } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'La pregunta es requerida.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY no está configurada en el entorno.' });
  }

  const payload = {
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente que responde preguntas sobre notas. Usa solo la información disponible en las notas proporcionadas.'
      },
      {
        role: 'user',
        content: buildPrompt(question, notes)
      }
    ],
    max_tokens: 500
  };

  try {
    const response = await fetchClient(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'Error al consultar Groq.', details: errorText });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || data?.output?.[0]?.content || JSON.stringify(data);

    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error en /api/chat.js', error);
    return res.status(500).json({ error: 'Error interno en el servidor.', details: error.message });
  }
}

module.exports = handler;
