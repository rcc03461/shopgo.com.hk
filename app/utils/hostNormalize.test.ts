// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import { normalizeRequestHostname } from './hostNormalize'

describe('normalizeRequestHostname', () => {
  test('會去掉埠並 lowercase', () => {
    expect(normalizeRequestHostname('Shop.EXAMPLE.com:443')).toBe(
      'shop.example.com',
    )
  })

  test('空字串回傳 null', () => {
    expect(normalizeRequestHostname('')).toBe(null)
  })

  test('首尾為點的 hostname 視為無效', () => {
    expect(normalizeRequestHostname('.example.com')).toBe(null)
  })
})
