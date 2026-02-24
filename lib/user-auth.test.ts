/**
 * Testes unitários para o sistema de login (user-auth.ts)
 *
 * Valida:
 * - Comparação de senha (texto puro e hash SHA-256)
 * - Rate limiting (bloqueio após 5 tentativas)
 * - Fluxo completo de login (sucesso e falha)
 * - Verificação de setup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/headers (cookies)
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}))

// Mock Supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockIn = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args)
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs)
            return {
              single: () => mockSingle(),
            }
          },
          in: (...inArgs: unknown[]) => {
            mockIn(...inArgs)
            return mockIn
          },
        }
      },
      upsert: (...args: unknown[]) => {
        mockUpsert(...args)
        return { error: null }
      },
      delete: () => ({
        eq: (...args: unknown[]) => {
          mockDelete(...args)
          return { error: null }
        },
      }),
    })),
  },
}))

// Mock phone-formatter
vi.mock('./phone-formatter', () => ({
  normalizePhoneNumber: (p: string) => p,
  validateAnyPhoneNumber: () => ({ isValid: true }),
}))

const ORIGINAL_ENV = process.env

beforeEach(() => {
  vi.clearAllMocks()
  process.env = {
    ...ORIGINAL_ENV,
    MASTER_PASSWORD: 'devpassword123',
    SETUP_COMPLETE: 'true',
  }

  // Default: nenhuma tentativa de login registrada
  mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.resetModules()
})

describe('loginUser', () => {
  it('deve rejeitar senha vazia', async () => {
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Senha é obrigatória')
  })

  it('deve rejeitar quando MASTER_PASSWORD não está configurada', async () => {
    delete process.env.MASTER_PASSWORD
    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('qualquersenha')
    expect(result.success).toBe(false)
    expect(result.error).toContain('MASTER_PASSWORD')
  })

  it('deve aceitar senha correta (texto puro)', async () => {
    // Mock: sem rate limiting (login_attempts = null)
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    // Mock: setStoredSessions/upsert
    mockUpsert.mockReturnValue({ error: null })
    // Mock: getStoredSessions (nenhuma sessão existente)
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    // Mock: getCompany
    mockIn.mockResolvedValueOnce({ data: [], error: null })

    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('devpassword123')

    expect(result.success).toBe(true)
  })

  it('deve rejeitar senha incorreta (texto puro)', async () => {
    // Mock: sem rate limiting
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    // Mock: recordFailedAttempt - getSetting
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    // Mock: upsert
    mockUpsert.mockReturnValue({ error: null })

    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('senhaerrada')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Senha incorreta')
  })

  it('deve aceitar senha correta (formato hash SHA-256)', async () => {
    // Gera hash SHA-256 de "minhaSenha" com o salt do SmartZap
    const encoder = new TextEncoder()
    const data = encoder.encode('minhaSenha_smartzap_salt_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    process.env.MASTER_PASSWORD = hash

    // Mock: sem rate limiting
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    // Mock: setStoredSessions
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    mockUpsert.mockReturnValue({ error: null })
    // Mock: getCompany
    mockIn.mockResolvedValueOnce({ data: [], error: null })

    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('minhaSenha')

    expect(result.success).toBe(true)
  })

  it('deve bloquear login após 5 tentativas (rate limiting)', async () => {
    // Mock: rate limiting ativo (5 tentativas, dentro do período)
    const recentDate = new Date().toISOString()
    mockSingle.mockResolvedValueOnce({
      data: { value: '5', updated_at: recentDate },
      error: null,
    })

    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('devpassword123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Muitas tentativas')
  })

  it('deve permitir login após período de lockout expirar', async () => {
    // Mock: rate limiting com timestamp antigo (>15 min atrás)
    const oldDate = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    mockSingle
      .mockResolvedValueOnce({
        data: { value: '5', updated_at: oldDate },
        error: null,
      })
    // clearFailedAttempts (delete)
    mockDelete.mockReturnValue({ error: null })
    // Agora o login procede:
    // getStoredSessions
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    mockUpsert.mockReturnValue({ error: null })
    // getCompany
    mockIn.mockResolvedValueOnce({ data: [], error: null })

    vi.resetModules()
    const { loginUser } = await import('./user-auth')
    const result = await loginUser('devpassword123')

    expect(result.success).toBe(true)
  })
})

describe('isSetupComplete', () => {
  it('deve retornar true quando SETUP_COMPLETE=true', async () => {
    process.env.SETUP_COMPLETE = 'true'
    vi.resetModules()
    const { isSetupComplete } = await import('./user-auth')
    const result = await isSetupComplete()
    expect(result).toBe(true)
  })

  it('deve retornar false quando SETUP_COMPLETE não está definida e banco não tem company', async () => {
    delete process.env.SETUP_COMPLETE
    process.env.NODE_ENV = 'development'
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    vi.resetModules()
    const { isSetupComplete } = await import('./user-auth')
    const result = await isSetupComplete()
    expect(result).toBe(false)
  })
})
