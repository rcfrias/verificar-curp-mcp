import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// A stand-in for the API: records requests, answers like the real one.
const requests = []
const api = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    requests.push({ method: req.method, url: req.url, key: req.headers['x-api-key'], body: body && JSON.parse(body) })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/v1/balance') return res.end(JSON.stringify({ success: true, balance: 7 }))
    if (req.url === '/api/v1/curp/verificacion/nope') {
      res.statusCode = 404
      return res.end(JSON.stringify({ success: false, error: 'No encontrada', code: 'NOT_FOUND' }))
    }
    res.end(JSON.stringify({ success: true, data: { curp: 'X', valida: true }, tokens_remaining: 6 }))
  })
})

let client
before(async () => {
  await new Promise((r) => api.listen(0, '127.0.0.1', r))
  client = new Client({ name: 'test', version: '0' })
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ['dist/index.js'],
      env: {
        VERIFICAR_CURP_API_KEY: 'curp_test',
        VERIFICAR_CURP_BASE_URL: `http://127.0.0.1:${api.address().port}/api/v1`,
      },
    })
  )
})
after(async () => {
  await client?.close()
  api.close()
})

const parse = (r) => JSON.parse(r.content[0].text)

test('lists the four tools', async () => {
  const { tools } = await client.listTools()
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    'consultar_saldo',
    'consultar_verificacion',
    'validar_curp',
    'verificar_curp_renapo',
  ])
})

test('validar_curp sends curp and persona with the API key', async () => {
  const r = await client.callTool({
    name: 'validar_curp',
    arguments: { curp: 'PEGJ850101HDFRRL04', persona: { nombres: 'Julio', segundoApellido: null } },
  })
  assert.equal(r.isError, undefined)
  assert.equal(parse(r).tokensRemaining, 6)
  const last = requests.at(-1)
  assert.equal(last.key, 'curp_test')
  assert.deepEqual(last.body, { curp: 'PEGJ850101HDFRRL04', persona: { nombres: 'Julio', segundoApellido: null } })
})

test('verificar_curp_renapo maps snake_case args to the API fields', async () => {
  await client.callTool({
    name: 'verificar_curp_renapo',
    arguments: { curp: 'PEGJ850101HDFRRL04', destination_id: 'dst_1', idempotency_key: 'k1' },
  })
  assert.deepEqual(requests.at(-1).body, {
    curp: 'PEGJ850101HDFRRL04',
    verificar: true,
    destinationId: 'dst_1',
    idempotencyKey: 'k1',
  })
})

test('consultar_saldo', async () => {
  assert.deepEqual(parse(await client.callTool({ name: 'consultar_saldo', arguments: {} })), { tokens: 7 })
})

test('API errors come back as a readable tool error', async () => {
  const r = await client.callTool({ name: 'consultar_verificacion', arguments: { job_id: 'nope' } })
  assert.equal(r.isError, true)
  assert.deepEqual(parse(r), { error: 'No encontrada', code: 'NOT_FOUND', status: 404 })
})
