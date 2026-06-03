#!/usr/bin/env node
/**
 * Higgsfield MCP - Servidor HTTP/SSE
 * Compatible con Perplexity (Pro/Max/Enterprise) y cualquier cliente MCP remoto
 * Puerto: process.env.PORT || 3000
 */
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.HIGGSFIELD_API_KEY;
const API_SECRET = process.env.HIGGSFIELD_API_SECRET;
const PORT = process.env.PORT || 3000;
const BASE_URL = "https://platform.higgsfield.ai";

if (!API_KEY || !API_SECRET) {
  console.error("ERROR: Define HIGGSFIELD_API_KEY y HIGGSFIELD_API_SECRET");
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
      throw new Error(`Generaci\u00f3n fallida: ${data.status}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout esperando resultado");
}

function createMCPServer() {
  const server = new Server(
    { name: "higgsfield-mcp", version: "1.1.0" },
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
            prompt: { type: "string", description: "Descripci\u00f3n de la imagen" },
            aspect_ratio: { type: "string", default: "1:1",
              description: "Relaci\u00f3n de aspecto: 1:1, 16:9, 9:16, 4:3" },
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
            prompt: { type: "string", description: "Descripci\u00f3n del video" },
            aspect_ratio: { type: "string", default: "16:9",
              description: "Relaci\u00f3n de aspecto: 16:9, 9:16, 1:1" },
            resolution: { type: "string", default: "720p",
              description: "Resoluci\u00f3n: 720p o 1080p" },
            wait: { type: "boolean", default: true,
              description: "Esperar resultado (true recomendado para videos)" },
          },
          required: ["prompt"],
        },
      },
      {
        name: "check_status",
        description: "Consulta el estado de una generaci\u00f3n por su request_id",
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
        description: "Cancela una generaci\u00f3n pendiente (solo en estado queued)",
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
            text: `\u2705 En cola!\nrequest_id: ${queued.request_id}\nStatus URL: ${queued.status_url}` }] };
        }
        const result = await pollStatus(queued.request_id);
        const urls = (result.images || []).map((i) => i.url).join("\n");
        return { content: [{ type: "text",
          text: `\ud83c\udfa8 Imagen lista!\nModelo: ${modelId}\nPrompt: ${args.prompt}\n\n${urls}` }] };
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
            text: `\u2705 Video en cola!\nrequest_id: ${queued.request_id}\nStatus URL: ${queued.status_url}` }] };
        }
        const result = await pollStatus(queued.request_id, 60, 8000);
        const videoUrl = result.video?.url || "(no disponible)";
        return { content: [{ type: "text",
          text: `\ud83c\udfac Video listo!\nModelo: ${modelId}\nPrompt: ${args.prompt}\n\n${videoUrl}` }] };
      }

      if (name === "check_status") {
        const res = await fetch(`${BASE_URL}/requests/${args.request_id}/status`, {
          headers: { Authorization: authHeader },
        });
        const data = await res.json();
        const media = data.images
          ? `\nIm\u00e1genes: ${data.images.map((i) => i.url).join(", ")}`
          : data.video ? `\nVideo: ${data.video.url}` : "";
        return { content: [{ type: "text",
          text: `\ud83d\udcca Request ${args.request_id}\nStatus: ${data.status}${media}` }] };
      }

      if (name === "cancel_generation") {
        const res = await fetch(`${BASE_URL}/requests/${args.request_id}/cancel`, {
          method: "POST",
          headers: { Authorization: authHeader },
        });
        return { content: [{ type: "text",
          text: res.status === 202
            ? `\u2705 Request ${args.request_id} cancelado.`
            : `\u274c No se pudo cancelar. Ya est\u00e1 procesando o no existe.` }] };
      }

      throw new Error(`Herramienta desconocida: ${name}`);
    } catch (err) {
      return { content: [{ type: "text", text: `\u274c Error: ${err.message}` }], isError: true };
    }
  });

  return server;
}

// Express app con SSE transport
const app = express();
const transports = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  const server = createMCPServer();
  await server.connect(transport);
});

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_, res) => res.json({ status: "ok", server: "higgsfield-mcp", version: "1.1.0" }));

app.listen(PORT, () => {
  console.log(`\u2705 Higgsfield MCP HTTP server corriendo en puerto ${PORT}`);
  console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
});
