import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini Client with required header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Analyst endpoint for Camposol attendance queries
app.post('/api/analyst', async (req, res) => {
  try {
    const { question, summaryContext } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'La pregunta es requerida' });
    }

    if (!ai) {
      return res.json({
        fallback: true,
        message: 'GEMINI_API_KEY no configurado en el servidor. Se utilizará el motor analítico algorítmico local.',
      });
    }

    const systemInstruction = `Eres el Analista de Datos Senior de CAMPOSOL especializado en Asistencia, Programación Laboral y Transporte Agrícola.
Tu trabajo es responder preguntas de supervisores, transporte, operaciones y gerencia utilizando EXCLUSIVAMENTE el dataset y las métricas resumidas provistas en el contexto.

REGLAS ESTRICTAS:
1. No inventar trabajadores, fechas, porcentajes ni conclusiones.
2. Basa todas tus afirmaciones en los números y datos exactos provistos en el resumen.
3. Si el usuario pregunta algo que no se encuentra en el contexto, o faltan columnas/datos requeridos, responde textualmente: "No existe información suficiente en el archivo cargado para responder esta consulta."
4. Sé conciso, profesional, ejecutivo y estructurado (utiliza viñetas, cifras claras con formato, y resalta las personas o áreas críticas).
5. Incluye siempre una breve sección final titulada "📌 Datos base utilizados" mencionando las métricas, registros o trabajadores analizados.`;

    const prompt = `CONTEXTO DEL DATASET CAMPOSOL:
${summaryContext || 'No hay datos cargados.'}

PREGUNTA DEL USUARIO:
${question}

Responde siguiendo rigurosamente las reglas establecidas:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return res.json({
      answer: response.text,
      usedAI: true,
    });
  } catch (error: any) {
    console.error('Error in /api/analyst:', error);
    return res.status(200).json({
      fallback: true,
      error: error.message || 'Error al procesar la consulta con Gemini',
    });
  }
});

// Vite middleware or static serving
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
