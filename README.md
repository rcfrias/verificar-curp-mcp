# verificar-curp-mcp

Servidor [MCP](https://modelcontextprotocol.io) oficial de [Verificar CURP](https://verificarcurp.com).
Deja que Claude, Cursor, VS Code y otros clientes MCP validen, coteen y verifiquen CURPs mexicanas en
RENAPO.

## Herramientas

| Herramienta | Qué hace | Costo |
| --- | --- | --- |
| `validar_curp` | Valida la estructura de la CURP y, con `persona`, la coteja con esos datos | 1 token |
| `verificar_curp_renapo` | Además la verifica en RENAPO; el resultado llega a tu destino (webhook, correo o chat) | 1 token |
| `consultar_verificacion` | Estado de una verificación por `job_id` | Gratis |
| `consultar_saldo` | Tokens disponibles | Gratis |
| `crear_enlace_captura` | Enlace de un solo uso para que tu cliente escriba su CURP desde su celular; el resultado llega a tu destino | Gratis; 1 token por respuesta del cliente |

Necesitas una API key: créala en [verificarcurp.com](https://verificarcurp.com) (panel → API Keys).

## Instalación

### Claude Code

```bash
claude mcp add verificar-curp -e VERIFICAR_CURP_API_KEY=curp_tu_api_key -- npx -y verificar-curp-mcp
```

### Claude Desktop, Cursor, VS Code y otros

```json
{
  "mcpServers": {
    "verificar-curp": {
      "command": "npx",
      "args": ["-y", "verificar-curp-mcp"],
      "env": { "VERIFICAR_CURP_API_KEY": "curp_tu_api_key" }
    }
  }
}
```

(Claude Desktop: `claude_desktop_config.json`. Cursor: `~/.cursor/mcp.json`.)

## Ejemplos

- "¿Es válida la CURP PEGJ850101HDFRRL04?"
- "Coteja la CURP PEGJ850101HDFRRL04 con Julio, nacido el 1 de enero de 1985."
- "¿Cuántos tokens me quedan en Verificar CURP?"

## Variables de entorno

| Variable | |
| --- | --- |
| `VERIFICAR_CURP_API_KEY` | Obligatoria |
| `VERIFICAR_CURP_BASE_URL` | Opcional, por defecto `https://verificarcurp.com/api/v1` |

## Enlaces

- Documentación de la API: https://verificarcurp.com/docs
- SDK de JavaScript: https://www.npmjs.com/package/verificar-curp
- SDK de Python: https://pypi.org/project/verificar-curp/

MIT
