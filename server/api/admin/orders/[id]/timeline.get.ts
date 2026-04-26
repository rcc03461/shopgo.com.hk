import { and, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const orderId = String(getRouterParam(event, 'id') ?? '').trim()
  if (!orderId) {
    throw createError({ statusCode: 400, message: '缺少訂單 id' })
  }

  const db = getDb(event)
  const [order] = await db
    .select({ id: schema.shopOrders.id })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.id, orderId),
        eq(schema.shopOrders.tenantId, session.tenantId),
      ),
    )
    .limit(1)
  if (!order) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  const [events, changes] = await Promise.all([
    db
      .select({
        id: schema.shopOrderEvents.id,
        eventType: schema.shopOrderEvents.eventType,
        actorType: schema.shopOrderEvents.actorType,
        actorId: schema.shopOrderEvents.actorId,
        source: schema.shopOrderEvents.source,
        note: schema.shopOrderEvents.note,
        metadata: schema.shopOrderEvents.metadata,
        eventAt: schema.shopOrderEvents.eventAt,
      })
      .from(schema.shopOrderEvents)
      .where(
        and(
          eq(schema.shopOrderEvents.orderId, order.id),
          eq(schema.shopOrderEvents.tenantId, session.tenantId),
        ),
      )
      .orderBy(desc(schema.shopOrderEvents.eventAt)),
    db
      .select({
        id: schema.shopOrderChangeLogs.id,
        fieldName: schema.shopOrderChangeLogs.fieldName,
        oldValue: schema.shopOrderChangeLogs.oldValue,
        newValue: schema.shopOrderChangeLogs.newValue,
        actorType: schema.shopOrderChangeLogs.actorType,
        actorId: schema.shopOrderChangeLogs.actorId,
        reason: schema.shopOrderChangeLogs.reason,
        changedAt: schema.shopOrderChangeLogs.changedAt,
      })
      .from(schema.shopOrderChangeLogs)
      .where(
        and(
          eq(schema.shopOrderChangeLogs.orderId, order.id),
          eq(schema.shopOrderChangeLogs.tenantId, session.tenantId),
        ),
      )
      .orderBy(desc(schema.shopOrderChangeLogs.changedAt)),
  ])

  return {
    events: events.map((item) => ({
      ...item,
      eventAt: item.eventAt.toISOString(),
    })),
    changes: changes.map((item) => ({
      ...item,
      changedAt: item.changedAt.toISOString(),
    })),
  }
})
