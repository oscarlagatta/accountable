import { date, dateLong, dateShort, dateTime, money, moneyShort, percent, toLocalInput, when } from './format'

describe('money', () => {
  it('[R26] whole dollars with the dollar sign and thousands separators', () => {
    expect(money(45000)).toBe('$45,000')
    expect(money(0)).toBe('$0')
    expect(money(1234567)).toBe('$1,234,567')
    expect(money(4938.4)).toBe('$4,938')
    expect(money(null)).toBe('$0')
  })

  it('[R26] shortened on the dashboard, always with the currency', () => {
    expect(moneyShort(1_200_000)).toBe('$1.2M')
    expect(moneyShort(2_840_000)).toBe('$2.84M')
    expect(moneyShort(950_000)).toBe('$950K')
    expect(moneyShort(168_000)).toBe('$168K')
    expect(moneyShort(1_500)).toBe('$1.5K')
    expect(moneyShort(800)).toBe('$800')
    expect(moneyShort(0)).toBe('$0')
    for (const v of [0, 5, 999, 45_000, 2_000_000]) {
      expect(moneyShort(v).startsWith('$')).toBe(true)
      expect(money(v).startsWith('$')).toBe(true)
    }
  })
})

describe('dates and percentages', () => {
  it('[R26] formats dates and percentages', () => {
    expect(date('2026-11-15')).toBe('Nov 15, 2026')
    expect(dateShort('2026-01-30')).toBe('Jan 30')
    expect(dateLong('2026-11-15')).toBe('Sunday, November 15, 2026')
    expect(dateTime('2026-11-15T09:42:00')).toBe('Nov 15, 2026, 9:42 AM')
    expect(toLocalInput('2026-11-15T09:42:00')).toBe('2026-11-15T09:42')
    expect(date(null)).toBe('')
    expect(percent(68)).toBe('68%')
    expect(percent(67.6)).toBe('68%')
    expect(percent(null)).toBe('—')
  })

  it('[R26] says when relative to today', () => {
    expect(when('2026-11-15T09:42:00', '2026-11-15')).toBe('Today, 9:42')
    expect(when('2026-11-14T16:00:00', '2026-11-15')).toBe('Yesterday')
    expect(when('2026-11-13T16:00:00', '2026-11-15')).toBe('Nov 13')
    expect(when('2025-12-31T16:00:00', '2026-01-02')).toBe('Dec 31, 2025')
    expect(when('2025-12-31T16:00:00', '2026-01-01')).toBe('Yesterday')
  })
})
