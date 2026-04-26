import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireStoreTenant } from '../../../utils/storeTenant'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const invoiceUuid = String(getRouterParam(event, 'invoiceUuid') ?? '').trim()
  if (!UUID_RE.test(invoiceUuid)) {
    throw createError({ statusCode: 400, message: '發票編號格式不正確' })
  }

  const db = getDb(event)
  const [order] = await db
    .select({
      id: schema.shopOrders.id,
      orderUuid: schema.shopOrders.invoicePublicId,
      status: schema.shopOrders.status,
      currency: schema.shopOrders.currency,
      subtotal: schema.shopOrders.subtotal,
      total: schema.shopOrders.total,
      customerEmail: schema.shopOrders.customerEmail,
      paymentProvider: schema.shopOrders.paymentProvider,
      createdAt: schema.shopOrders.createdAt,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, tenant.id),
        eq(schema.shopOrders.invoicePublicId, invoiceUuid),
      ),
    )
    .limit(1)

  if (!order) {
    throw createError({ statusCode: 404, message: '找不到發票' })
  }

  const lines = await db
    .select({
      id: schema.shopOrderLines.id,
      title: schema.shopOrderLines.titleSnapshot,
      sku: schema.shopOrderLines.skuSnapshot,
      unitPrice: schema.shopOrderLines.unitPrice,
      quantity: schema.shopOrderLines.quantity,
      lineTotal: schema.shopOrderLines.lineTotal,
    })
    .from(schema.shopOrderLines)
    .where(eq(schema.shopOrderLines.orderId, order.id))

  return {
    order: {
      ...order,
      subtotal: String(order.subtotal),
      total: String(order.total),
      createdAt: order.createdAt.toISOString(),
      lines: lines.map((line) => ({
        ...line,
        unitPrice: String(line.unitPrice),
        lineTotal: String(line.lineTotal),
      })),
    },
  }
})
