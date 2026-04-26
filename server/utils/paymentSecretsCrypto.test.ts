// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import { decryptSecretsJson, encryptSecretsJson } from './paymentSecretsCrypto'

describe('paymentSecretsCrypto', () => {
  test('主金鑰不一致時回傳可理解的設定錯誤', () => {
    const encrypted = encryptSecretsJson(
      { secretKey: 'sk_test_example' },
      Buffer.alloc(32, 1),
    )

    expect(() => decryptSecretsJson(encrypted, Buffer.alloc(32, 2))).toThrow(
      '金流密鑰無法解密',
    )
  })
})
