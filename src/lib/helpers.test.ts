import { describe, it, expect } from 'vitest'
import { normalizePublicId, friendlyError, ageFromBirthDate, parseReps, describeItem } from './helpers'

describe('normalizePublicId', () => {
  it('acepta con o sin # y en minúsculas', () => {
    expect(normalizePublicId(' #k4m92 ')).toBe('#K4M92')
    expect(normalizePublicId('k4m92')).toBe('#K4M92')
  })
  it('rechaza longitud incorrecta o caracteres ambiguos', () => {
    expect(normalizePublicId('#K4M9')).toBeNull()
    expect(normalizePublicId('#K4M0O')).toBeNull()
    expect(normalizePublicId('')).toBeNull()
  })
})

describe('friendlyError', () => {
  it('traduce códigos conocidos', () => {
    expect(friendlyError('P0001: cliente_no_existe')).toBe('No hay ningún cliente con ese ID')
  })
  it('da un mensaje genérico para errores desconocidos', () => {
    expect(friendlyError('boom')).toBe('Algo salió mal. Comprueba tu conexión e inténtalo de nuevo.')
  })
})

describe('ageFromBirthDate', () => {
  const today = new Date(2026, 10, 24)
  it('resta un año si aún no cumplió', () => {
    expect(ageFromBirthDate('2000-12-01', today)).toBe(25)
  })
  it('cuenta el año si ya cumplió', () => {
    expect(ageFromBirthDate('2000-06-15', today)).toBe(26)
  })
})

describe('parseReps', () => {
  it('acepta número fijo y rango', () => {
    expect(parseReps('8')).toBe('8')
    expect(parseReps(' 8 - 10 ')).toBe('8-10')
    expect(parseReps('8–10')).toBe('8-10')
  })
  it('rechaza valores inválidos', () => {
    expect(parseReps('')).toBeNull()
    expect(parseReps('10-8')).toBeNull()
    expect(parseReps('0')).toBeNull()
    expect(parseReps('ocho')).toBeNull()
    expect(parseReps('8-')).toBeNull()
  })
})

describe('describeItem', () => {
  it('muestra series, reps y kilos', () => {
    expect(describeItem({ sets: 4, reps: '8-10', weight_kg: 60 })).toBe('4 × 8-10 · 60 kg')
    expect(describeItem({ sets: 3, reps: '12', weight_kg: null })).toBe('3 × 12')
  })
})

describe('friendlyError extra', () => {
  it('traduce ejercicio en uso y duplicados', () => {
    expect(friendlyError('violates foreign key constraint')).toContain('en uso')
    expect(friendlyError('duplicate key value')).toBe('Eso ya existe')
  })
})
