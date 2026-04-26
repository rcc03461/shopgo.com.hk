import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { buildOrderChangeLogs, getOrderEventTypeByStatus } from '../../../utils/orderHistory'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const orderIdParamSchema = z.string().uuid('訂單 id 格式不正確')

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'payment_failed',
  'shipping',
  'signed',
] as const
const patchBodySchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: '訂單狀態不正確' }).optional(),
  customerEmail: z
    .union([z.string().email('Email 格式不正確'), z.literal(''), z.null()])
    .optional(),
  shippingData: z.record(z.string(), z.unknown()).nullable().optional(),
  changeReason: z
    .union([z.string().max(500), z.literal('')])
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  note: z
    .union([z.string().max(500), z.literal('')])
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
})

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)

  const idParsed = orderIdParamSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({
      statusCode: 404,
      message: idParsed.error.issues[0]?.message ?? '訂單 id 格式不正確',
    })
  }
  const orderId = idParsed.data

  const parsed = patchBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const db = getDb(event)
  const payload = parsed.data
  if (
    typeof payload.status === 'undefined' &&
    typeof payload.customerEmail === 'undefined' &&
    typeof payload.shippingData === 'undefined'
  ) {
    throw createError({ statusCode: 400, message: '至少要更新一項欄位' })
  }

  const [beforeOrder] = await db
    .select({
      id: schema.shopOrders.id,
      status: schema.shopOrders.status,
      customerEmail: schema.shopOrders.customerEmail,
      shippingData: schema.shopOrders.shippingData,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.id, orderId),
        eq(schema.shopOrders.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!beforeOrder) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  const nextStatus = payload.status ?? beforeOrder.status
  const nextCustomerEmail =
    typeof payload.customerEmail === 'undefined'
      ? beforeOrder.customerEmail
      : payload.customerEmail && payload.customerEmail.trim()
        ? payload.customerEmail.trim()
        : null
  const nextShippingData =
    typeof payload.shippingData === 'undefined'
      ? beforeOrder.shippingData
      : payload.shippingData

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.shopOrders)
      .set({
        status: nextStatus,
        customerEmail: nextCustomerEmail,
        shippingData: nextShippingData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.shopOrders.id, orderId),
          eq(schema.shopOrders.tenantId, session.tenantId),
        ),
      )
      .returning({
        id: schema.shopOrders.id,
        status: schema.shopOrders.status,
        customerEmail: schema.shopOrders.customerEmail,
        shippingData: schema.shopOrders.shippingData,
        updatedAt: schema.shopOrders.updatedAt,
      })

    if (!row) return []

    if (beforeOrder.status !== row.status) {
      const statusEvent = getOrderEventTypeByStatus(row.status)
      if (statusEvent) {
        await tx.insert(schema.shopOrderEvents).values({
          tenantId: session.tenantId,
          orderId: row.id,
          eventType: statusEvent,
          actorType: 'admin',
          actorId: session.sub,
          source: 'admin',
          note: payload.note ?? null,
          metadata: {
            previousStatus: beforeOrder.status,
            nextStatus: row.status,
          },
        })
      }
    }

    const changes = buildOrderChangeLogs({
      before: {
        customerEmail: beforeOrder.customerEmail,
        shippingData: beforeOrder.shippingData,
      },
      after: {
        customerEmail: row.customerEmail,
        shippingData: row.shippingData,
      },
      allowedFields: ['customerEmail', 'shippingData'],
    })

    if (changes.length > 0) {
      await tx.insert(schema.shopOrderChangeLogs).values(
        changes.map((item) => ({
          tenantId: session.tenantId,
          orderId: row.id,
          actorType: 'admin' as const,
          actorId: session.sub,
          reason: payload.changeReason ?? null,
          fieldName: item.fieldName,
          oldValue: item.oldValue,
          newValue: item.newValue,
        })),
      )

      await tx.insert(schema.shopOrderEvents).values({
        tenantId: session.tenantId,
        orderId: row.id,
        eventType: 'customer_info_updated',
        actorType: 'admin',
        actorId: session.sub,
        source: 'admin',
        note: payload.note ?? payload.changeReason ?? null,
        metadata: {
          changedFields: changes.map((item) => item.fieldName),
        },
      })
    }

    return [row]
  })

  if (!updated) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  return {
    order: {
      id: updated.id,
      status: updated.status,
      customerEmail: updated.customerEmail,
      shippingData: updated.shippingData,
      updatedAt: updated.updatedAt.toISOString(),
    },
  }
})
