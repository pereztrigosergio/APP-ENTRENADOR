import { describe, it, expect } from 'vitest'
import { validateRegistration } from './validate'

const ok = { name: 'Ana', email: 'ana@correo.com', password: '12345678', role: 'client' as const }

describe('validateRegistration', () => {
  it('rechaza contraseña de 7 caracteres', () => {
    expect(validateRegistration({ ...ok, password: '1234567' })).toBe('La contraseña debe tener al menos 8 caracteres')
  })
  it('rechaza nombre vacío o solo espacios', () => {
    expect(validateRegistration({ ...ok, name: '   ' })).toBe('Escribe tu nombre')
  })
  it('rechaza correo sin @', () => {
    expect(validateRegistration({ ...ok, email: 'ana.correo.com' })).toBe('Correo no válido')
  })
  it('acepta datos correctos', () => {
    expect(validateRegistration(ok)).toBeNull()
  })
})
