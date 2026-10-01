#!/usr/bin/env node
/**
 * Servidor MCP de Verificar CURP (stdio).
 *
 * Requiere VERIFICAR_CURP_API_KEY. VERIFICAR_CURP_BASE_URL es opcional.
 * https://verificarcurp.com/docs
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { VerificarCurpClient } from 'verificar-curp'
import { registerTools } from './tools.js'

const VERSION = '1.1.0'

const apiKey = process.env.VERIFICAR_CURP_API_KEY
if (!apiKey) {
  // stdout is the protocol channel; diagnostics go to stderr.
  console.error(
    'verificar-curp-mcp: falta VERIFICAR_CURP_API_KEY. Crea una API key en https://verificarcurp.com (panel → API Keys).'
  )
  process.exit(1)
}

const client = new VerificarCurpClient({
  apiKey,
  ...(process.env.VERIFICAR_CURP_BASE_URL ? { baseUrl: process.env.VERIFICAR_CURP_BASE_URL } : {}),
})

const server = new McpServer({ name: 'verificar-curp', version: VERSION })
registerTools(server, client)

await server.connect(new StdioServerTransport())
