import { describe, it, expect } from 'vitest'
import { AppError, isAppError } from './errors.js'

describe('AppError', () => {
  it('should create an error with default values', () => {
    const error = new AppError({ message: 'Test error' })
    
    expect(error.message).toBe('Test error')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.timestamp).toBeDefined()
  })

  it('should create an error with custom values', () => {
    const error = new AppError({
      message: 'Custom error',
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { path: '/test' },
      context: { userId: '123' }
    })
    
    expect(error.message).toBe('Custom error')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.details).toEqual({ path: '/test' })
    expect(error.context).toEqual({ userId: '123' })
  })

  it('should convert to JSON', () => {
    const error = new AppError({
      message: 'JSON test',
      statusCode: 400,
      code: 'BAD_REQUEST'
    })
    
    const json = error.toJSON()
    expect(json.message).toBe('JSON test')
    expect(json.statusCode).toBe(400)
    expect(json.code).toBe('BAD_REQUEST')
    expect(json.timestamp).toBeDefined()
  })

  it('should be identified by isAppError', () => {
    const error = new AppError({ message: 'Test' })
    expect(isAppError(error)).toBe(true)
    expect(isAppError(new Error('Regular error'))).toBe(false)
  })
})

