import { describe, expect, it } from 'vitest'
import { addressSchema, loginSchema, money, registerSchema } from './schemas'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
  it('rejects a malformed email and an empty password', () => {
    const r = loginSchema.safeParse({ email: 'nope', password: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map(i => i.path[0])).toEqual(expect.arrayContaining(['email', 'password']))
  })
})

describe('registerSchema', () => {
  const base = { fullName: 'Ana', email: 'ana@example.com', password: 'Passw0rd1' }
  it('accepts a strong password', () => expect(registerSchema.safeParse(base).success).toBe(true))
  it.each([['short1', 'too short'], ['allletters', 'no digit'], ['12345678', 'no letter']])('rejects %s (%s)', (password) => {
    expect(registerSchema.safeParse({ ...base, password }).success).toBe(false)
  })
})

describe('addressSchema', () => {
  it('requires a numeric postal code', () => {
    const ok = { fullName: 'A', phone: '9999999999', line1: 'x', city: 'Pune', state: 'MH', postalCode: '411001' }
    expect(addressSchema.safeParse(ok).success).toBe(true)
    expect(addressSchema.safeParse({ ...ok, postalCode: 'abc' }).success).toBe(false)
  })
})

describe('money', () => {
  it('formats rupees', () => expect(money(1234.5)).toContain('1,234.50'))
})
