#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.HIGGSFIELD_API_KEY;
const API_SECRET = process.env.HIGGSFIELD_API_SECRET;
const BASE_URL = "https://platform.higgsfield.ai";

if (!API_KEY || !API_SECRET) {
  console.error("ERROR: Necesitas HIGGSFIELD_API_KEY y HIGGSFIELD_API_SECRET como variables de entorno.");
  process.exit(1);
}

const authHeader = `Key ${API_KEY}:${API_SECRET}`;

async function submitGeneration(modelId, body) {
  const res = await fetch(`${BASE_URL}/${modelId}`, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error al enviar: ${res.status} - ${await res.text()}`);
  return res.json();
}

async function pollStatus(requestId, maxAttempts = 30, intervalMs = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/status`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) throw new Error(`Error status: ${res.status}`);
    const data = await res.json();
    if (data.status === "completed") return data;
    if (["failed", "nsfw"].includes(data.status))
      throw new Error(`Generación fallida: ${data.status}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout esperando resultado");
}

const server = new Server(
  { name: "higgsfield-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_image",
      description: "Genera una imagen con Higgsfield AI. Modelos: nano-banana/pro, flux-kontext/standard, gpt-image/standard",
      inputSchema: {
        type: "object",
        properties: {
          model_id: { type: "string", default: "higgsfield-ai/nano-banana/pro",
            description: "ID del modelo. Ej: higgsfield-ai/nano-banana/pro" },
          prompt: { type: "string", description: "Descripción de la imagen" },
          aspect_ratio: { type: "string", default: "1:1",
            description: "Relación de aspecto: 1:1, 16:9, 9:16, 4:3" },
          wait: { type: "boolean", default: true,
            description: "Esperar resultado completo (true) o solo encolar (false)" },
        },
        required: ["prompt"],
      },
    },
    {
      name: "generate_video",
      description: "Genera un video con Higgsfield AI. Modelos: seedance/v2, kling/v2-5-turbo, sora/v2, wan/v2-5, minimax-hailuo/02",
      inputSchema: {
        type: "object",
        properties: {
          model_id: { type: "string", default: "higgsfield-ai/seedance/v2",
            description: "ID del modelo de video" },
          prompt: { type: "string", description: "Descripción del video" },
          aspect_ratio: { type: "string", default: "16:9",
            description: "Relación de aspecto: 16:9, 9:16, 1:1" },
          resolution: { type: "string", default: "720p",
            description: "Resolución: 720p o 1080p" },
          wait: { type: "boolean", default: true,
            description: "Esperar resultado (true recomendado para videos)" },
        },
        required: ["prompt"],
      },
    },
    {
      name: "check_status",
      description: "Consulta el estado de una generación por su request_id",
      inputSchema: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "UUID del request" },
        },
        required: ["request_id"],
      },
    },
    {
      name: "cancel_generation",
      description: "Cancela una generación pendiente (solo en estado queued)",
      inputSchema: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "UUID del request a cancelar" },
        },
        required: ["request_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "generate_image") {
      const modelId = args.model_id || "higgsfield-ai/nano-banana/pro";
      const queued = await submitGeneration(modelId, {
        prompt: args.prompt,
        aspect_ratio: args.aspect_ratio || "1:1",
      });
      if (args.wait === false) {
        return { content: [{ type: "text",
          text: `✅ En cola!\nrequest_id: ${queued.request_id}\nStatus URL: ${queued.status_url}` }] };
      }
      const result = await pollStatus(queued.request_id);
      const urls = (result.images || []).map((i) => i.url).join("\n");
      return { content: [{ type: "text",
        text: `🎨 Imagen lista!\nModelo: ${modelId}\nPrompt: ${args.prompt}\n\n${urls}` }] };
    }

    if (name === "generate_video") {
      const modelId = args.model_id || "higgsfield-ai/seedance/v2";
      const queued = await submitGeneration(modelId, {
        prompt: args.prompt,
        aspect_ratio: args.aspect_ratio || "16:9",
        resolution: args.resolution || "720p",
      });
      if (args.wait === false) {
        return { content: [{ type: "text",
          text: `✅ Video en cola!\nrequest_id: ${queued.request_id}\nStatus URL: ${queued.status_url}` }] };
      }
      const result = await pollStatus(queued.request_id, 60, 8000);
      const videoUrl = result.video?.url || "(no disponible)";
      return { content: [{ type: "text",
        text: `🎬 Video listo!\nModelo: ${modelId}\nPrompt: ${args.prompt}\n\n${videoUrl}` }] };
    }

    if (name === "check_status") {
      const res = await fetch(`${BASE_URL}/requests/${args.request_id}/status`, {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      const media = data.images
        ? `\nImágenes: ${data.images.map((i) => i.url).join(", ")}`
        : data.video ? `\nVideo: ${data.video.url}` : "";
      return { content: [{ type: "text",
        text: `📊 Request ${args.request_id}\nStatus: ${data.status}${media}` }] };
    }

    if (name === "cancel_generation") {
      const res = await fetch(`${BASE_URL}/requests/${args.request_id}/cancel`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      return { content: [{ type: "text",
        text: res.status === 202
          ? `✅ Request ${args.request_id} cancelado.`
          : `❌ No se pudo cancelar. Ya está procesando o no existe.` }] };
    }

    throw new Error(`Herramienta desconocida: ${name}`);
  } catch (err) {
    return { content: [{ type: "text", text: `❌ Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ Higgsfield MCP server corriendo...");
