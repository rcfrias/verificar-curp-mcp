import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { VerificarCurpError, type VerificarCurpClient } from 'verificar-curp'

const personaSchema = z
  .object({
    nombres: z.string().max(200).optional(),
    primerApellido: z.string().max(200).optional(),
    segundoApellido: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .describe('null = la persona no tiene segundo apellido (se compara). Omitir = no comparar.'),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('AAAA-MM-DD'),
    sexo: z.string().max(30).optional().describe('H o M'),
    entidad: z.string().max(100).optional().describe('Nombre o clave de la entidad de nacimiento'),
  })
  .describe('Datos que ya conoces de la persona, para cotejarlos con la CURP. Solo se compara lo que mandas.')

type Result = { content: { type: 'text'; text: string }[]; isError?: boolean }

function ok(value: unknown): Result {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

/** API failures go back to the model as a tool error it can read and explain,
 *  not as a protocol error that aborts the call. */
async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    return ok(await fn())
  } catch (err) {
    const e = err as VerificarCurpError
    const body =
      err instanceof VerificarCurpError
        ? { error: e.message, code: e.code, status: e.status }
        : { error: err instanceof Error ? err.message : String(err) }
    return { content: [{ type: 'text', text: JSON.stringify(body) }], isError: true }
  }
}

export function registerTools(server: McpServer, client: VerificarCurpClient): void {
  server.registerTool(
    'validar_curp',
    {
      title: 'Validar CURP',
      description:
        'Valida la estructura de una CURP mexicana (longitud, formato, entidad, fecha de nacimiento, ' +
        'dígito verificador) y, si mandas `persona`, la coteja con esos datos. Responde al instante. ' +
        'Una CURP mal formada NO es un error: `valida` es false y `razon` dice qué está mal. ' +
        'No consulta RENAPO (para eso usa verificar_curp_renapo). Consume 1 token de tu saldo.',
      inputSchema: {
        curp: z.string().min(1).max(64).describe('La CURP, 18 caracteres'),
        persona: personaSchema.optional(),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
    },
    ({ curp, persona }) => run(() => client.validate({ curp, persona }))
  )

  server.registerTool(
    'verificar_curp_renapo',
    {
      title: 'Verificar CURP en RENAPO',
      description:
        'Valida la CURP y la verifica además en el registro de RENAPO. La respuesta llega al instante con ' +
        '`verificacion.job_id`; el resultado del registro (estatus ACTIVA, BAJA, RNE o NO_ENCONTRADA y ' +
        'los datos registrados) se entrega por separado al destino `destination_id` (webhook, correo o ' +
        'chat configurado en el panel de verificarcurp.com), normalmente en segundos. Si ' +
        '`verificacion.aceptada` es false, `codigo` y `retry_after` dicen por qué y cuándo reintentar. ' +
        'Consume 1 token.',
      inputSchema: {
        curp: z.string().min(1).max(64),
        destination_id: z.string().min(1).max(64).describe('ID del destino (panel → Destinos)'),
        persona: personaSchema.optional(),
        idempotency_key: z
          .string()
          .max(128)
          .optional()
          .describe('Etiqueta propia; repetirla no crea otra verificación ni cobra. Nunca pongas la CURP aquí.'),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ curp, destination_id, persona, idempotency_key }) =>
      run(() =>
        client.validate({
          curp,
          persona,
          verificar: true,
          destinationId: destination_id,
          idempotencyKey: idempotency_key,
        })
      )
  )

  server.registerTool(
    'consultar_verificacion',
    {
      title: 'Consultar verificación',
      description:
        'Estado de una verificación en RENAPO por su job_id (pending, running, retry-wait, needs-human, ' +
        'delivered, failed, expired), sin costo. Si el resultado del registro sigue guardado llega en ' +
        '`valores` UNA sola vez y se borra; si el destino ya lo recibió, solo trae el estado.',
      inputSchema: { job_id: z.string().min(1).max(64) },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ job_id }) => run(() => client.getVerification(job_id))
  )

  server.registerTool(
    'consultar_saldo',
    {
      title: 'Consultar saldo',
      description: 'Tokens disponibles en tu cuenta de Verificar CURP. Sin costo.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () => run(async () => ({ tokens: await client.getBalance() }))
  )
}
