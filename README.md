# 🎬 Higgsfield MCP Server

Servidor MCP para usar [Higgsfield AI](https://higgsfield.ai/) desde **Claude Desktop**, **Perplexity** (Pro/Max/Enterprise) y cualquier cliente MCP compatible.

> Genera imágenes y videos con IA de alta calidad desde tu chat.

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `generate_image` | Genera imágenes (Nano Banana, FLUX, GPT Image, etc.) |
| `generate_video` | Genera videos (Seedance 2.0, Kling 2.5, Sora 2, Wan 2.5, etc.) |
| `check_status` | Consulta el estado de una generación por `request_id` |
| `cancel_generation` | Cancela una generación en cola |

---

## 🟣 Opción A: Deploy en Fly.io (para Perplexity)

Perplexity requiere una **URL pública HTTP/SSE**. Deploy en Fly.io en menos de 2 minutos:

```bash
git clone https://github.com/luisitoys12/higgsfield-mcp
cd higgsfield-mcp
npm install

# Crear app en Fly.io
fly apps create higgsfield-mcp

# Definir secrets (API keys de Higgsfield)
fly secrets set HIGGSFIELD_API_KEY=tu_api_key_aqui
fly secrets set HIGGSFIELD_API_SECRET=tu_api_secret_aqui

# Deploy
fly deploy
```

Tu URL SSE será: `https://higgsfield-mcp.fly.dev/sse`

### Conectar en Perplexity

1. Ve a **Perplexity** → Settings → **AI** → **Connectors** (o **MCP Servers**)
2. Haz click en **+ Add custom connector**
3. Ingresa:
   - **Name:** Higgsfield AI
   - **URL:** `https://higgsfield-mcp.fly.dev/sse`
   - **Auth:** Open (sin autenticación adicional, las keys ya están en el servidor)
4. Guarda y listo ✅

> Requiere suscripción **Pro, Max o Enterprise** de Perplexity.

---

## 💙 Opción B: Claude Desktop (stdio local)

```bash
git clone https://github.com/luisitoys12/higgsfield-mcp
cd higgsfield-mcp
npm install
```

Edita `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "higgsfield": {
      "command": "node",
      "args": ["/ruta/completa/a/higgsfield-mcp/index.js"],
      "env": {
        "HIGGSFIELD_API_KEY": "tu_api_key_aqui",
        "HIGGSFIELD_API_SECRET": "tu_api_secret_aqui"
      }
    }
  }
}
```

---

## Modelos disponibles

### Imágenes
| Model ID | Modelo |
|---|---|
| `higgsfield-ai/nano-banana/pro` | Nano Banana Pro (foto-realista) |
| `higgsfield-ai/flux-kontext/standard` | FLUX Kontext |
| `higgsfield-ai/gpt-image/standard` | GPT Image 2 |

### Videos
| Model ID | Modelo |
|---|---|
| `higgsfield-ai/seedance/v2` | Seedance 2.0 ✅ recomendado |
| `higgsfield-ai/kling/v2-5-turbo` | Kling 2.5 Turbo |
| `higgsfield-ai/sora/v2` | Sora 2 |
| `higgsfield-ai/wan/v2-5` | Wan 2.5 |
| `higgsfield-ai/minimax-hailuo/02` | MiniMax Hailuo 02 |

---

## Licencia

MIT — Hecho con ❤️ por [Estacionkusmedios](https://estacionkusmedios.org)
