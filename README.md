# 🎬 Higgsfield MCP Server

Servidor MCP para usar [Higgsfield AI](https://higgsfield.ai/) directamente desde Claude Desktop u otro cliente MCP compatible.

> Genera imágenes y videos con IA de alta calidad desde tu chat.

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `generate_image` | Genera imágenes (Nano Banana, FLUX, GPT Image, etc.) |
| `generate_video` | Genera videos (Seedance 2.0, Kling 2.5, Sora 2, Wan 2.5, etc.) |
| `check_status` | Consulta el estado de una generación por `request_id` |
| `cancel_generation` | Cancela una generación en cola |

## Instalación

### 1. Clona el repo e instala dependencias

```bash
git clone https://github.com/luisitoys12/higgsfield-mcp
cd higgsfield-mcp
npm install
```

### 2. Obtén tu API Key de Higgsfield

Entra a [higgsfield.ai](https://higgsfield.ai/) → Settings → API Keys y copia:
- `HIGGSFIELD_API_KEY`
- `HIGGSFIELD_API_SECRET`

### 3. Configura Claude Desktop

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

## Ejemplos de uso en Claude

```
Genera una imagen fotorealista de una ciudad de noche en México con nano banana
```

```
Crea un video de 5 segundos de ondas en el océano con Seedance 2.0
```

```
Revisa el estado del request d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff
```

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

> Los IDs exactos de cada modelo están en [docs.higgsfield.ai](https://docs.higgsfield.ai)

## Licencia

MIT — Hecho con ❤️ por [Estacionkusmedios](https://estacionkusmedios.org)
