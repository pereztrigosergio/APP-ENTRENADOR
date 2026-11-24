import { describe, it, expect } from 'vitest'
import { normalizePublicId, friendlyError, ageFromBirthDate } from './helpers'

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
