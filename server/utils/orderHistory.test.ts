// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import {
  buildOrderChangeLogs,
  getOrderEventTypeByStatus,
} from './orderHistory'

describe('orderHistory', () => {
  test('狀態可對應流程事件', () => {
    expect(getOrderEventTypeByStatus('shipping')).toBe('shipping_started')
    expect(getOrderEventTypeByStatus('signed')).toBe('delivered_signed')
    expect(getOrderEventTypeByStatus('paid')).toBe('payment_confirmed')
    expect(getOrderEventTypeByStatus('payment_failed')).toBe('payment_failed')
    expect(getOrderEventTypeByStatus('pending_payment')).toBeNull()
  })

  test('可產生收件資料異動紀錄', () => {
    const changes = buildOrderChangeLogs({
      before: {
        customerEmail: 'old@example.com',
        shippingData: {
          name: 'Old Name',
          phone: '1111',
          address: 'A street',
        },
      },
      after: {
        customerEmail: 'new@example.com',
        shippingData: {
          name: 'New Name',
          phone: '2222',
          address: 'A street',
        },
      },
      allowedFields: ['customerEmail', 'shippingData'],
    })

    expect(changes).toEqual([
      {
        fieldName: 'customerEmail',
        oldValue: 'old@example.com',
        newValue: 'new@example.com',
      },
      {
        fieldName: 'shippingData.name',
        oldValue: 'Old Name',
        newValue: 'New Name',
      },
      {
        fieldName: 'shippingData.phone',
        oldValue: '1111',
        newValue: '2222',
      },
    ])
  })
})
