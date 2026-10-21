import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Shared Gemini Client with user-agent header for telemetry
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Helper para ejecutar generación con cascade resiliente entre gemini-3.8-flash y gemini-3.1-flash-lite
async function generateWithModelCascade(ai: any, contents: any[], schemaConfig: any) {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          ...schemaConfig,
          maxOutputTokens: 65536,
        },
      });

      if (response && response.text) {
        let cleaned = response.text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }
        const parsed = JSON.parse(cleaned);
        return { parsed, model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Cascade] Modelo ${model} no disponible o falló:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo generar respuesta con ningún modelo de IA');
}

// Endpoint oficial de extracción inteligente con IA
app.post('/api/extract-plan-pdf', async (req, res) => {
  try {
    const { text, filename, pdfBase64 } = req.body;
    if ((!text || typeof text !== 'string') && !pdfBase64) {
      return res.status(400).json({ error: 'Texto o archivo PDF no proporcionado', fallback: true });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ fallback: true, message: 'Gemini no configurado en entorno, usando motor local de precisión' });
    }

    const prompt = `Actúa como especialista técnico y administrativo de la Diputación Provincial de Cádiz (Área de Desarrollo Local).
Tu tarea es analizar con MÁXIMA PRECISIÓN Y RIGOR ADMINISTRATIVO el documento oficial PDF de "Certificación de Acuerdo de Pleno de Aprobación Definitiva de las Bases y Actuaciones del Plan Provincial" (Secretaría General de la Excma. Diputación Provincial de Cádiz).

INSTRUCCIÓN MANDATORIA FUNDAMENTAL:
DEBES COPIAR ABSOLUTAMENTE TODOS LOS DATOS Y TODAS LAS ACTUACIONES DE LA TABLA/ANEXO SIN OMITIR NINGUNA SOLA FILA.
Si el documento tiene 20, 40 o 55 actuaciones correspondientes a los municipios y ELAs de la provincia de Cádiz, debes extraer el 100% de las filas una por una. Está terminantemente prohibido truncar la lista, omitir filas o usar puntos suspensivos ("...").

REGLAS DE EXTRACCIÓN DETALLADA:
1. "nombrePlan": Nombre oficial completo exacto del Plan tal como figura aprobado en el acuerdo plenario (ej: "Plan Cádiz Marcha + 2026", "Plan + Inversión Cádiz 2026", "Plan Provincial de Cooperación a las Obras y Servicios de Competencia Municipal").
2. "codigoPlan": Código identificador oficial formal con el ejercicio (ej: "PCM-2026", "PIC-2026", "PPOS-2026"). Si no figura uno explícito, sintetízalo con las siglas del plan y el año.
3. "ejercicio": Ejercicio presupuestario como número entero (ej: 2026).
4. "plazoEjecucionMaximo": Plazo máximo ordinario de ejecución en formato YYYY-MM-DD (ej: 2027-06-30). Convierte expresiones como "30 de junio de 2027" o "18 meses" a fecha ISO YYYY-MM-DD.
5. "plazoJustificacionMaximo": Plazo máximo ordinario de justificación en formato YYYY-MM-DD (ej: 2027-09-30).
6. "plazoEjecucionAmpliado": Plazo máximo ampliado de ejecución en formato YYYY-MM-DD (si el acuerdo contempla prórroga o ampliación; si no, igual al plazo máximo ordinario).
7. "plazoJustificacionAmpliado": Plazo máximo ampliado de justificación en formato YYYY-MM-DD (si el acuerdo contempla prórroga o ampliación; si no, igual al plazo máximo ordinario).
8. "presupuestoTotal": Presupuesto total consignado en euros (número flotante o entero, sin caracteres no numéricos). Si no figura una cifra total explícita, calcula exactamente la suma total de las subvenciones concedidas en el Anexo.
9. "descripcion": Síntesis del acuerdo plenario, sesión del pleno y bases de concesión aprobadas.
10. "actuaciones": Lista completa y veraz de actuaciones del Plan EXTRAÍDAS OBLIGATORIAMENTE Y SIN OMITIR NINGUNA de la sección o tabla titulada "ANEXO RELACIÓN DE ACTUACIONES QUE INTEGRAN EL PLAN" (o "ANEXO: RELACIÓN DE ACTUACIONES", "ANEXO DE INVERSIONES DE LAS ENTIDADES LOCALES", etc.):
    - "numero": Número correlativo de actuación en dos dígitos ("01", "02", etc.).
    - "entidadLocal": Municipio o ELA beneficiaria de la provincia de Cádiz exacta (ej: Grazalema, Ubrique, Vejer de la Frontera, Barbate, Tarifa, Medina Sidonia, Olvera, Arcos de la Frontera, Alcalá de los Gazules, Benalup-Casas Viejas, Bornos, Algodonales, Facinas, Tahivilla, etc.).
    - "titulo": Título o denominación íntegra y literal de la obra, proyecto o inversión (une líneas si el texto del título está en varias líneas).
    - "aplicacionPresupuestaria": Aplicación presupuestaria oficial (ej: "2026-03-920-46200" o similar).
    - "subvencionSolicitada": Importe de la subvención / inversión aprobada en euros (número flotante o entero).

Documento de origen: ${filename || 'Certificado_Acuerdo_Pleno.pdf'}
${text ? `\nTexto completo extraído del documento:\n${text.slice(0, 80000)}` : ''}
`;

    const contents: any[] = [];
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    contents.push(prompt);

    const schema = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nombrePlan: { type: Type.STRING },
          codigoPlan: { type: Type.STRING },
          ejercicio: { type: Type.INTEGER },
          plazoEjecucionMaximo: { type: Type.STRING },
          plazoJustificacionMaximo: { type: Type.STRING },
          plazoEjecucionAmpliado: { type: Type.STRING },
          plazoJustificacionAmpliado: { type: Type.STRING },
          presupuestoTotal: { type: Type.NUMBER },
          descripcion: { type: Type.STRING },
          actuaciones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING },
                entidadLocal: { type: Type.STRING },
                titulo: { type: Type.STRING },
                aplicacionPresupuestaria: { type: Type.STRING },
                subvencionSolicitada: { type: Type.NUMBER },
              },
              required: ['numero', 'entidadLocal', 'titulo', 'subvencionSolicitada'],
            },
          },
        },
        required: [
          'nombrePlan',
          'ejercicio',
          'actuaciones',
        ],
      },
    };

    const { parsed, model } = await generateWithModelCascade(ai, contents, schema);

    if (parsed && parsed.actuaciones && parsed.actuaciones.length > 0) {
      if (!parsed.codigoPlan) {
        parsed.codigoPlan = `${(parsed.nombrePlan || 'PLAN').split(' ').map((w: string) => w[0]?.toUpperCase()).join('')}-${parsed.ejercicio || 2026}`;
      }
      if (!parsed.presupuestoTotal) {
        parsed.presupuestoTotal = parsed.actuaciones.reduce((acc: number, a: any) => acc + (Number(a.subvencionSolicitada) || 0), 0);
      }
      return res.json({ success: true, data: parsed, engine: model });
    }

    return res.json({ fallback: true });
  } catch (error: any) {
    console.error('Error al invocar Gemini API:', error);
    return res.json({ fallback: true, error: error.message });
  }
});

// Endpoint para procesar exclusivamente el Anexo de Inversiones de cada EELL (en PDF o texto)
app.post('/api/parse-annex-investments', async (req, res) => {
  try {
    const { text, pdfBase64, filename } = req.body;
    const ai = getGeminiClient();

    if (!ai || (!text && !pdfBase64)) {
      return res.json({ fallback: true });
    }

    const prompt = `Analiza con MÁXIMA PRECISIÓN el documento oficial o texto del ANEXO DE INVERSIONES DE LAS ENTIDADES LOCALES (EELL) de la Diputación Provincial de Cádiz.
Extrae la relación íntegra de inversiones de cada Municipio o ELA de Cádiz, COPIANDO ABSOLUTAMENTE TODAS LAS FILAS SIN OMITIR NINGUNA:
- numero: Número de actuación ("01", "02", etc.)
- entidadLocal: Municipio o ELA de Cádiz (ej: Grazalema, Ubrique, Vejer, Barbate, Tarifa, Arcos, etc.)
- titulo: Obra, proyecto o inversión exacto
- subvencionSolicitada: Importe exacto de la inversión / subvención concedida (número en euros)
- aplicacionPresupuestaria: Aplicación presupuestaria (ej: 2026-03-920-46200)

${text ? `\nTexto:\n${text.slice(0, 80000)}` : ''}
`;

    const contents: any[] = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    contents.push(prompt);

    const schema = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actuaciones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING },
                entidadLocal: { type: Type.STRING },
                titulo: { type: Type.STRING },
                aplicacionPresupuestaria: { type: Type.STRING },
                subvencionSolicitada: { type: Type.NUMBER },
              },
              required: ['numero', 'entidadLocal', 'titulo', 'subvencionSolicitada'],
            },
          },
        },
        required: ['actuaciones'],
      },
    };

    const { parsed } = await generateWithModelCascade(ai, contents, schema);

    if (parsed && parsed.actuaciones && parsed.actuaciones.length > 0) {
      return res.json({ success: true, actuaciones: parsed.actuaciones });
    }
    return res.json({ fallback: true });
  } catch (err: any) {
    return res.json({ fallback: true, error: err.message });
  }
});

// Endpoint oficial para extraer únicamente el Anexo de Inversiones de cada EELL para un plan
app.post('/api/extract-anexo-eell', async (req, res) => {
  try {
    const { text, filename, pdfBase64, planNombre } = req.body;
    if ((!text || typeof text !== 'string') && !pdfBase64) {
      return res.status(400).json({ error: 'Texto o archivo PDF no proporcionado', fallback: true });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ fallback: true, message: 'Gemini no configurado en entorno' });
    }

    const prompt = `Actúa como especialista técnico y administrativo de la Diputación Provincial de Cádiz.
Analiza con total rigor administrativo y precisión el documento, tabla o anexo con la relación de actuaciones e inversiones de las Entidades Locales para el plan "${planNombre || 'Plan Provincial'}".

REGLAS ESTRICTAS DE EXTRACCIÓN Y MAPEO DE COLUMNAS (100% OBLIGATORIO):
El archivo contiene tablas con las siguientes columnas oficiales que debes mapear exactamente:
1. "Nº ACT." (primera columna, también identificada como "Nº", "Nº ACTUACIÓN", "NÚMERO"):
   -> Extrae su valor en el campo "numero" (columna NÚMERO de la app). Formato de dos dígitos ("01", "02", etc.) o el código oficial asignado.
2. "ENTIDAD LOCAL" (columna identificada como "ENTIDAD LOCAL", "EELL", "MUNICIPIO", "AYUNTAMIENTO"):
   -> Extrae su valor en el campo "entidadLocal" (columna EELL de la app). Nombre oficial del municipio o ELA de la provincia de Cádiz (ej: Grazalema, Vejer de la Frontera, Ubrique, Barbate, Tarifa, Arcos de la Frontera, Medina Sidonia, Olvera, Alcalá de los Gazules, Benalup-Casas Viejas, etc.).
3. "ACTUACIÓN" (columna identificada como "ACTUACIÓN", "TÍTULO DE LA ACTUACIÓN", "DENOMINACIÓN", "PROYECTO", "OBRA"):
   -> Extrae su valor en el campo "titulo" (columna TÍTULO DE LA ACTUACIÓN de la app). Título íntegro, literal y completo del proyecto u obra.
4. "APLICACIÓN PRESUPUESTARIA" (columna identificada como "APLICACIÓN PRESUPUESTARIA", "APLICACION PPTARIA", "PARTIDA"):
   -> Extrae su valor en el campo "aplicacionPresupuestaria" (columna APLICACIÓN PRESUPUESTARIA de la app). Ejemplo: "2026-03-920-46200".
5. "SUBVENCIÓN SOLICITADA A DIPUTACION" (columna identificada como "SUBVENCIÓN SOLICITADA A DIPUTACION", "SUBVENCIÓN SOLICITADA", "SUBVENCIÓN", "IMPORTE SOLICITADO"):
   -> Extrae su valor en el campo "subvencionSolicitada" (columna IMPORTE de la app, número flotante o entero en euros, sin el símbolo € ni puntos de miles).

MANDATO CRÍTICO:
Debes extraer ABSOLUTAMENTE TODAS las filas de actuaciones sin omitir ninguna sola fila, sin truncar y sin usar puntos suspensivos ("...").

Documento: ${filename || 'Relacion_Actuaciones_EELL.pdf'}
${text ? `\nTexto completo o tabla extraída:\n${text.slice(0, 80000)}` : ''}
`;

    const contents: any[] = [];
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    contents.push(prompt);

    const schema = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actuaciones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING },
                entidadLocal: { type: Type.STRING },
                titulo: { type: Type.STRING },
                aplicacionPresupuestaria: { type: Type.STRING },
                subvencionSolicitada: { type: Type.NUMBER },
              },
              required: ['numero', 'entidadLocal', 'titulo', 'aplicacionPresupuestaria', 'subvencionSolicitada'],
            },
          },
        },
        required: ['actuaciones'],
      },
    };

    const { parsed, model } = await generateWithModelCascade(ai, contents, schema);

    if (parsed && parsed.actuaciones && parsed.actuaciones.length > 0) {
      return res.json({ success: true, data: parsed.actuaciones, engine: model });
    }

    return res.json({ fallback: true });
  } catch (error: any) {
    console.error('Error al invocar Gemini API para Anexo EELL:', error);
    return res.json({ fallback: true, error: error.message });
  }
});

// Inicializar Vite middleware en modo desarrollo o estáticos en producción
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto de servidor no válido.');

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

  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor ADL Diputación de Cádiz activo en http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error al arrancar servidor:', err);
  process.exit(1);
});
