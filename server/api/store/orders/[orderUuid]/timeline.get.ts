import { and, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import { requireStoreCustomerSession } from '../../../../utils/requireStoreCustomerSession'

const PUBLIC_EVENT_TYPES = new Set([
  'order_created',
  'payment_confirmed',
  'payment_failed',
  'shipping_started',
  'delivered_signed',
  'customer_info_updated',
])

export default defineEventHandler(async (event) => {
  const orderUuid = String(getRouterParam(event, 'orderUuid') ?? '').trim()
  if (!orderUuid) {
    throw createError({ statusCode: 400, message: '缺少 orderUuid' })
  }

  const { tenant, customer } = await requireStoreCustomerSession(event)
  const db = getDb(event)
  const [order] = await db
    .select({
      id: schema.shopOrders.id,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, tenant.tenantId),
        eq(schema.shopOrders.customerId, customer.id),
        eq(schema.shopOrders.invoicePublicId, orderUuid),
      ),
    )
    .limit(1)
  if (!order) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  const events = await db
    .select({
      id: schema.shopOrderEvents.id,
      eventType: schema.shopOrderEvents.eventType,
      note: schema.shopOrderEvents.note,
      eventAt: schema.shopOrderEvents.eventAt,
    })
    .from(schema.shopOrderEvents)
    .where(
      and(
        eq(schema.shopOrderEvents.orderId, order.id),
        eq(schema.shopOrderEvents.tenantId, tenant.tenantId),
      ),
    )
    .orderBy(desc(schema.shopOrderEvents.eventAt))

  return {
    events: events
      .filter((item) => PUBLIC_EVENT_TYPES.has(item.eventType))
      .map((item) => ({
        ...item,
        eventAt: item.eventAt.toISOString(),
      })),
  }
})
