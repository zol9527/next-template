/**
 * File: test/unit/services/ai-generation.service.test.ts
 * Description: AI 生成服务错误恢复单元测试
 *   测试 Provider 未配置、Provider 未注册、API 错误降级、structured output 重试、审计日志等
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAiGenerationService } from '@/services/core/ai-generation.service'
import type { AiUsageLogRepository } from '@/repositories/interfaces/core/ai-usage-log.interface'
import type { AiPromptTemplateRepository } from '@/repositories/interfaces/core/ai-prompt-template.interface'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { AiTemplateService } from '@/services/core/ai-template.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

// ==================== Mock 依赖 ====================

// Mock minimax provider 模块（替代原来的 provider-registry）
const mockCreateMiniMaxTextProvider = vi.fn()
const MockMiniMaxImageProvider = vi.fn()

vi.mock('@/lib/ai/providers/minimax', () => ({
  createMiniMaxTextProvider: (...args: unknown[]) => mockCreateMiniMaxTextProvider(...args),
  MiniMaxImageProvider: function (...args: unknown[]) {
    return MockMiniMaxImageProvider(...args)
  },
}))

// Mock encryption 模块
vi.mock('@/lib/ai/core/encryption', () => ({
  AiKeyEncryption: {
    decrypt: vi.fn().mockReturnValue('test-api-key'),
  },
}))

// Mock config 模块
const mockGetProviderConfig = vi.fn()
const mockGetDefaultProviderName = vi.fn()

vi.mock('@/lib/ai/core/config', () => ({
  getProviderConfig: (...args: unknown[]) => mockGetProviderConfig(...args),
  getDefaultProviderName: (...args: unknown[]) => mockGetDefaultProviderName(...args),
}))

// Mock structured-output 模块
const mockParseStructuredOutput = vi.fn()

vi.mock('@/lib/ai/core/structured-output', () => ({
  parseStructuredOutput: (...args: unknown[]) => mockParseStructuredOutput(...args),
}))

// Mock cost-table 模块
vi.mock('@/lib/ai/cost-table', () => ({
  calculateCost: vi.fn().mockReturnValue(0.001),
  calculateImageCost: vi.fn().mockReturnValue(0.04),
}))

// Mock sanitize-html 模块
vi.mock('@/lib/utils/sanitize-html.util', () => ({
  sanitizeHtml: vi.fn((html: string) => html),
}))

// ==================== Mock 工厂 ====================

/** 创建 Mock Logger */
function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }
}

/** 创建 Mock ServiceContext */
function createMockServiceContext(): ServiceContext {
  return {
    traceId: 'test-trace-id',
    logger: createMockLogger() as unknown as ServiceContext['logger'],
  }
}

/** 创建 Mock AiUsageLogRepository */
function createMockUsageLogRepo(): AiUsageLogRepository {
  return {
    create: vi.fn().mockResolvedValue({ id: 'log-id' }),
  } as unknown as AiUsageLogRepository
}

/** 创建 Mock AiPromptTemplateRepository */
function createMockTemplateRepo(): AiPromptTemplateRepository {
  return {
    findByKey: vi.fn().mockResolvedValue(null),
  } as unknown as AiPromptTemplateRepository
}

/** 创建 Mock SystemSettingsRepository */
function createMockSettingsRepo(): SystemSettingsRepository {
  return {
    getSetting: vi.fn().mockResolvedValue(null),
  } as unknown as SystemSettingsRepository
}

/** 创建 Mock AiTemplateService */
function createMockTemplateService(): AiTemplateService {
  return {
    interpolateTemplate: vi.fn().mockResolvedValue({
      prompt: 'You are a helpful assistant.',
    }),
  } as unknown as AiTemplateService
}

/** 创建标准的 Provider 配置 */
function createMockProviderConfig() {
  return {
    provider: 'minimax' as const,
    apiKey: 'test-api-key',
    baseUrl: 'https://api.minimax.chat/v1',
    textModel: 'MiniMax-M2.7',
    imageModel: 'image-01',
  }
}

/** 创建 Mock 文本 Provider */
function createMockTextProvider() {
  return {
    generateText: vi.fn().mockResolvedValue({
      content: '{"name": "测试商品"}',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      model: 'MiniMax-M2.7',
    }),
    streamText: vi.fn(),
  }
}

/** 创建 Mock 图片 Provider */
function createMockImageProvider() {
  return {
    generateImage: vi.fn().mockResolvedValue({
      url: 'https://cdn.example.com/image.png',
      assetId: 'asset-123',
    }),
  }
}

// ==================== 测试套件 ====================

describe('Unit: AiGenerationService', () => {
  let mockUsageLogRepo: AiUsageLogRepository
  let mockTemplateRepo: AiPromptTemplateRepository
  let mockSettingsRepo: SystemSettingsRepository
  let mockTemplateService: AiTemplateService
  let mockCtx: ServiceContext
  let mockRepoCtx: RepoContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockUsageLogRepo = createMockUsageLogRepo()
    mockTemplateRepo = createMockTemplateRepo()
    mockSettingsRepo = createMockSettingsRepo()
    mockTemplateService = createMockTemplateService()
    mockCtx = createMockServiceContext()
    mockRepoCtx = {
      traceId: mockCtx.traceId,
      logger: mockCtx.logger.child({ layer: 'repository' }),
    }

    // 默认配置：Provider 已配置且为 minimax
    mockGetDefaultProviderName.mockResolvedValue('minimax')
    mockGetProviderConfig.mockResolvedValue(createMockProviderConfig())

    // 默认 mock provider 工厂返回正常 provider
    mockCreateMiniMaxTextProvider.mockReturnValue(createMockTextProvider())
    MockMiniMaxImageProvider.mockReturnValue(createMockImageProvider())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Provider 未配置 ====================

  describe('Provider 未配置', () => {
    it('调用 generateProductText 时 Provider 未配置应抛出 AI_PROVIDER_NOT_CONFIGURED 错误', async () => {
      mockGetProviderConfig.mockResolvedValue(null)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductText({
          kind: 'name',
          userId: 'user-1',
        }),
      ).rejects.toThrow('AI Provider 未配置')
    })

    it('调用 generateProductImage 时 Provider 未配置应抛出错误', async () => {
      mockGetProviderConfig.mockResolvedValue(null)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductImage({
          prompt: '一个红色杯子',
          userId: 'user-1',
        }),
      ).rejects.toThrow('AI Provider 未配置')
    })

    it('错误对象应包含 code 属性', async () => {
      mockGetProviderConfig.mockResolvedValue(null)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      try {
        await service.generateProductText({ kind: 'name', userId: 'user-1' })
        expect.fail('应抛出错误')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error & { code: string }).code).toBe('AI_PROVIDER_NOT_CONFIGURED')
      }
    })
  })

  // ==================== Provider 未注册 ====================

  describe('Provider 未注册到 Registry', () => {
    it('调用 generateProductText 时 Provider 未注册应抛出 AI_PROVIDER_NOT_REGISTERED 错误', async () => {
      // 使用不支持的 provider name（非 'minimax'），触发 providerUnavailableError
      mockGetDefaultProviderName.mockResolvedValue('unsupported_provider')

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductText({
          kind: 'name',
          userId: 'user-1',
        }),
      ).rejects.toThrow('未注册到 Provider Registry')
    })

    it('调用 generateProductImage 时 Provider 未注册应抛出错误', async () => {
      // 使用不支持的 provider name（非 'minimax'），触发 providerUnavailableError
      mockGetDefaultProviderName.mockResolvedValue('unsupported_provider')

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductImage({
          prompt: '一个蓝色瓶子',
          userId: 'user-1',
        }),
      ).rejects.toThrow('未注册到 Provider Registry')
    })
  })

  // ==================== API 错误降级 ====================

  describe('MiniMax API 错误降级', () => {
    it('Provider generateText 抛出错误时，调用方应能捕获', async () => {
      const mockProvider = createMockTextProvider()
      mockProvider.generateText.mockRejectedValue(new Error('MiniMax API 限流: 429'))
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductText({
          kind: 'name',
          userId: 'user-1',
        }),
      ).rejects.toThrow('MiniMax API 限流: 429')
    })

    it('Provider generateImage 抛出错误时，调用方应能捕获', async () => {
      const mockProvider = createMockImageProvider()
      mockProvider.generateImage.mockRejectedValue(new Error('图片生成服务不可用'))
      MockMiniMaxImageProvider.mockReturnValue(mockProvider)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await expect(
        service.generateProductImage({
          prompt: '商品图片',
          userId: 'user-1',
        }),
      ).rejects.toThrow('图片生成服务不可用')
    })
  })

  // ==================== Structured Output 重试 ====================

  describe('Structured Output 解析失败', () => {
    it('suggestProductPricing 解析失败时返回 rawText 作为 reasoning', async () => {
      const mockProvider = createMockTextProvider()
      mockProvider.generateText.mockResolvedValue({
        content: '价格应该在 50-100 元之间，考虑到市场行情...',
        usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
        model: 'MiniMax-M2.7',
      })
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)

      // structured output 解析失败
      mockParseStructuredOutput.mockResolvedValue({
        success: false,
        error: 'STRUCTURED_OUTPUT_FAILED',
        rawText: '价格应该在 50-100 元之间，考虑到市场行情...',
      })

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      const result = await service.suggestProductPricing({
        kind: 'course',
        userId: 'user-1',
      })

      // suggestedPrice 回退到 0，reasoning 回退到原始文本
      expect(result.suggestedPrice).toBe(0)
      expect(result.reasoning).toBe('价格应该在 50-100 元之间，考虑到市场行情...')
    })

    it('suggestProductPricing 解析成功时返回结构化数据', async () => {
      const mockProvider = createMockTextProvider()
      mockProvider.generateText.mockResolvedValue({
        content: '{"suggestedPrice": 99.9, "reasoning": "基于市场分析"}',
        usage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
        model: 'MiniMax-M2.7',
      })
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)

      mockParseStructuredOutput.mockResolvedValue({
        success: true,
        data: { suggestedPrice: 99.9, reasoning: '基于市场分析' },
      })

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      const result = await service.suggestProductPricing({
        kind: 'course',
        userId: 'user-1',
      })

      expect(result.suggestedPrice).toBe(99.9)
      expect(result.reasoning).toBe('基于市场分析')
    })
  })

  // ==================== 审计日志 ====================

  describe('审计日志记录', () => {
    it('generateProductText 成功时记录审计日志', async () => {
      const mockProvider = createMockTextProvider()
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await service.generateProductText({
        kind: 'name',
        userId: 'user-1',
      })

      expect(mockUsageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        expect.objectContaining({
          userId: 'user-1',
          capability: 'text_generation',
          provider: 'minimax',
          model: 'MiniMax-M2.7',
          status: 'success',
        }),
      )
    })

    it('generateProductImage 成功时记录审计日志', async () => {
      const mockProvider = createMockImageProvider()
      MockMiniMaxImageProvider.mockReturnValue(mockProvider)

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await service.generateProductImage({
        prompt: '商品图片',
        userId: 'user-1',
      })

      expect(mockUsageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        expect.objectContaining({
          userId: 'user-1',
          capability: 'image_generation',
          provider: 'minimax',
          model: 'image-01',
          status: 'success',
        }),
      )
    })

    it('suggestProductPricing 解析失败时记录 error 状态', async () => {
      const mockProvider = createMockTextProvider()
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)

      mockParseStructuredOutput.mockResolvedValue({
        success: false,
        error: 'STRUCTURED_OUTPUT_FAILED',
        rawText: '无法解析的价格文本',
      })

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      await service.suggestProductPricing({
        kind: 'course',
        userId: 'user-1',
      })

      expect(mockUsageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        expect.objectContaining({
          status: 'error',
          errorMessage: '结构化输出解析失败',
        }),
      )
    })

    it('审计日志写入失败时不影响主流程', async () => {
      const mockProvider = createMockTextProvider()
      mockCreateMiniMaxTextProvider.mockReturnValue(mockProvider)
      // 审计日志写入失败
      ;(mockUsageLogRepo.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('数据库连接失败'),
      )

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      // 主流程不应被阻塞
      const result = await service.generateProductText({
        kind: 'name',
        userId: 'user-1',
      })

      expect(result.content).toBeDefined()
      expect(result.usage).toBeDefined()
    })
  })

  // ==================== 一键 Pipeline ====================

  describe('generateProductAll Pipeline', () => {
    it('Pipeline 中某步骤失败不影响其他步骤', async () => {
      // 文本生成成功
      const mockTextProvider = createMockTextProvider()
      mockCreateMiniMaxTextProvider.mockReturnValue(mockTextProvider)

      // 图片生成失败
      const mockImageProvider = createMockImageProvider()
      mockImageProvider.generateImage.mockRejectedValue(new Error('图片服务宕机'))
      MockMiniMaxImageProvider.mockReturnValue(mockImageProvider)

      // 价格建议成功（structured output 成功）
      mockParseStructuredOutput.mockResolvedValue({
        success: true,
        data: { suggestedPrice: 88, reasoning: '合理定价' },
      })

      const service = createAiGenerationService(
        {
          aiUsageLog: mockUsageLogRepo,
          aiPromptTemplate: mockTemplateRepo,
          systemSettings: mockSettingsRepo,
          templateService: mockTemplateService,
        },
        mockCtx,
      )

      const events = []
      for await (const event of service.generateProductAll({
        kind: 'name',
        userId: 'user-1',
      })) {
        events.push(event)
      }

      // 验证 Pipeline 开始事件
      expect(events[0]).toEqual({
        type: 'pipeline_start',
        steps: ['text', 'image', 'pricing'],
      })

      // 验证文本步骤成功
      const textComplete = events.find(
        (e) => e.type === 'step_complete' && e.step === 'text',
      )
      expect(textComplete).toBeDefined()

      // 验证图片步骤失败但不阻塞
      const imageError = events.find(
        (e) => e.type === 'step_error' && e.step === 'image',
      )
      expect(imageError).toBeDefined()
      expect((imageError as { error: string }).error).toBe('图片服务宕机')

      // 验证价格步骤完成
      const pricingComplete = events.find(
        (e) => e.type === 'step_complete' && e.step === 'pricing',
      )
      expect(pricingComplete).toBeDefined()

      // 验证 Pipeline 完成
      const pipelineComplete = events.find((e) => e.type === 'pipeline_complete')
      expect(pipelineComplete).toBeDefined()
      expect((pipelineComplete as { results: Record<string, unknown> }).results.text).toBeDefined()
    })
  })
})
