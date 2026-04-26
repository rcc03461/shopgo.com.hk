export const ORDER_EVENT_TYPES = [
  'order_created',
  'payment_confirmed',
  'payment_failed',
  'shipping_started',
  'delivered_signed',
  'customer_info_updated',
] as const

export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number]

export function getOrderEventTypeByStatus(status: string): OrderEventType | null {
  if (status === 'paid') return 'payment_confirmed'
  if (status === 'payment_failed') return 'payment_failed'
  if (status === 'shipping') return 'shipping_started'
  if (status === 'signed') return 'delivered_signed'
  return null
}

type BuildOrderChangeLogsInput = {
  before: Record<string, unknown>
  after: Record<string, unknown>
  allowedFields: string[]
}

export type OrderChangeLogItem = {
  fieldName: string
  oldValue: string | null
  newValue: string | null
}

export type OrderAuditActor = {
  actorType: 'customer' | 'admin' | 'system'
  actorId?: string | null
  source: 'store' | 'admin' | 'system' | 'api'
}

function toPlainValue(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildObjectDiff(
  keyPrefix: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): OrderChangeLogItem[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const out: OrderChangeLogItem[] = []
  for (const key of keys) {
    const b = before[key]
    const a = after[key]
    const oldValue = toPlainValue(b)
    const newValue = toPlainValue(a)
    if (oldValue !== newValue) {
      out.push({
        fieldName: `${keyPrefix}.${key}`,
        oldValue,
        newValue,
      })
    }
  }
  return out
}

export function buildOrderChangeLogs(
  input: BuildOrderChangeLogsInput,
): OrderChangeLogItem[] {
  const out: OrderChangeLogItem[] = []
  for (const fieldName of input.allowedFields) {
    const beforeValue = input.before[fieldName]
    const afterValue = input.after[fieldName]
    if (fieldName === 'shippingData' && isRecord(beforeValue) && isRecord(afterValue)) {
      out.push(...buildObjectDiff(fieldName, beforeValue, afterValue))
      continue
    }
    const oldValue = toPlainValue(beforeValue)
    const newValue = toPlainValue(afterValue)
    if (oldValue !== newValue) {
      out.push({ fieldName, oldValue, newValue })
    }
  }
  return out
}
