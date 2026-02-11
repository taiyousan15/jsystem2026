import { LLMClient } from '../../src/performance/LLMClient'
import { ModelRouter } from '../../src/performance/ModelRouter'
import { CostTracker } from '../../src/performance/CostTracker'
import type { LLMRequest, ModelSelectionCriteria } from '../../src/performance/types'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('LLMClient', () => {
  let client: LLMClient
  let router: ModelRouter
  let costTracker: CostTracker

  beforeEach(() => {
    jest.clearAllMocks()
    costTracker = new CostTracker()
    router = new ModelRouter({ costTracker })
    client = new LLMClient({ router, costTracker })
  })

  describe('completeWithModel', () => {
    it('should call Anthropic API for claude-sonnet', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Hello from Claude' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      })

      const request: LLMRequest = { prompt: 'Say hello' }
      const response = await client.completeWithModel('claude-sonnet', request)

      expect(response.content).toBe('Hello from Claude')
      expect(response.model).toBe('claude-sonnet')
      expect(response.provider).toBe('anthropic-api')
      expect(response.inputTokens).toBe(10)
      expect(response.outputTokens).toBe(20)
      expect(response.latencyMs).toBeGreaterThanOrEqual(0)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      )
      delete process.env.ANTHROPIC_API_KEY
    })

    it('should call Ollama API for ollama-qwen3-coder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Hello from Ollama' },
          prompt_eval_count: 15,
          eval_count: 25,
        }),
      })

      const request: LLMRequest = { prompt: 'Say hello' }
      const response = await client.completeWithModel('ollama-qwen3-coder', request)

      expect(response.content).toBe('Hello from Ollama')
      expect(response.model).toBe('ollama-qwen3-coder')
      expect(response.provider).toBe('ollama')
      expect(response.inputTokens).toBe(15)
      expect(response.outputTokens).toBe(25)
    })

    it('should call OpenRouter API for openrouter-free', async () => {
      process.env.OPENROUTER_API_KEY = 'test-or-key'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from OpenRouter' } }],
          usage: { prompt_tokens: 12, completion_tokens: 18 },
        }),
      })

      const request: LLMRequest = { prompt: 'Say hello' }
      const response = await client.completeWithModel('openrouter-free', request)

      expect(response.content).toBe('Hello from OpenRouter')
      expect(response.model).toBe('openrouter-free')
      expect(response.provider).toBe('openrouter')
      delete process.env.OPENROUTER_API_KEY
    })

    it('should throw if Anthropic API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY
      const request: LLMRequest = { prompt: 'test' }
      await expect(
        client.completeWithModel('claude-sonnet', request)
      ).rejects.toThrow('ANTHROPIC_API_KEY is not set')
    })

    it('should throw if OpenRouter API key is missing', async () => {
      delete process.env.OPENROUTER_API_KEY
      const request: LLMRequest = { prompt: 'test' }
      await expect(
        client.completeWithModel('openrouter-free', request)
      ).rejects.toThrow('OPENROUTER_API_KEY is not set')
    })

    it('should throw on API error response', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      })

      const request: LLMRequest = { prompt: 'test' }
      await expect(
        client.completeWithModel('claude-sonnet', request)
      ).rejects.toThrow('Anthropic API error 429')
      delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('system prompt and temperature', () => {
    it('should include system prompt in Anthropic request', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'with system' }],
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      })

      const request: LLMRequest = {
        prompt: 'test',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.5,
      }
      await client.completeWithModel('claude-sonnet', request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.system).toBe('You are a helpful assistant')
      expect(callBody.temperature).toBe(0.5)
      delete process.env.ANTHROPIC_API_KEY
    })
  })
})
