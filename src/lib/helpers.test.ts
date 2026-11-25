import { describe, it, expect } from 'vitest'
import { normalizePublicId, friendlyError, ageFromBirthDate, parseReps, describeItem, firstNumber, buildSetRows, toUi, fromUi, pickLast, describeLast, type HistoryRow } from './helpers'

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

describe('serie a serie', () => {
  const item = { id: 'i1', position: 1, exercise_id: 'e1', exercise_name: 'Sentadilla', sets: 3, reps: '8-10', weight_kg: 60, note: null, variants: [] }
  it('firstNumber toma el primer número', () => {
    expect(firstNumber('8-10')).toBe(8)
    expect(firstNumber('12')).toBe(12)
  })
  it('buildSetRows crea una fila por serie con lo prescrito', () => {
    const rows = buildSetRows([item])
    expect(rows).toHaveLength(3)
    expect(rows[2]).toMatchObject({ set_number: 3, prescribed_reps: '8-10', prescribed_weight: 60, reps_done: 8, weight_done: 60, done: false })
  })
  it('fromUi acepta coma decimal y vacíos', () => {
    const ui = toUi(buildSetRows([item])[0])
    expect(fromUi({ ...ui, weightStr: '62,5', repsStr: '9' })).toMatchObject({ reps_done: 9, weight_done: 62.5 })
    expect(fromUi({ ...ui, weightStr: '', repsStr: '' })).toMatchObject({ reps_done: null, weight_done: null })
    expect('repsStr' in fromUi(ui)).toBe(false)
  })
})

describe('última vez', () => {
  const h = (log: string, at: string | null, set: number, reps: number, w: number, done = true): HistoryRow =>
    ({ exercise_id: 'e1', set_number: set, reps_done: reps, weight_done: w, done, session_log_id: log, completed_at: at })
  const rows = [
    h('A', '2026-11-10T10:00:00+00:00', 1, 8, 55), h('A', '2026-11-10T10:00:00+00:00', 2, 8, 55),
    h('B', '2026-11-17T10:00:00+00:00', 1, 8, 60), h('B', '2026-11-17T10:00:00+00:00', 2, 7, 60),
    h('B', '2026-11-17T10:00:00+00:00', 3, 6, 60, false)
  ]
  it('usa la sesión terminada más reciente y solo series hechas', () => {
    const last = pickLast(rows)
    expect(last.e1[1]).toEqual({ reps: 8, weight: 60 })
    expect(last.e1[2]).toEqual({ reps: 7, weight: 60 })
    expect(last.e1[3]).toBeUndefined()
  })
  it('ignora la sesión actual', () => {
    expect(pickLast(rows, 'B').e1[1]).toEqual({ reps: 8, weight: 55 })
  })
  it('buildSetRows rellena con la última vez y, si no hay, con la pauta', () => {
    const item = { id: 'i1', position: 1, exercise_id: 'e1', exercise_name: 'X', sets: 3, reps: '8-10', weight_kg: 50, note: null, variants: [] }
    const r = buildSetRows([item], pickLast(rows))
    expect(r[1]).toMatchObject({ reps_done: 7, weight_done: 60 })
    expect(r[2]).toMatchObject({ reps_done: 8, weight_done: 50 })
  })
  it('describeLast', () => {
    expect(describeLast({ reps: 8, weight: 60 })).toBe('8 × 60 kg')
    expect(describeLast(undefined)).toBe('—')
  })
})
