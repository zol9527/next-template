/**
 * SeedContext 上下文管理
 * 用于模块间状态追踪和结果传递
 *
 * Function: SeedContext
 *
 * Description: 为 seed 模块执行提供统一的上下文对象，
 *   跟踪每个模块的执行状态（pending/running/success/skipped/failed），
 *   支持模块间通过 setResult/getResult 传递依赖结果。
 */

export class SeedContext {
  #db
  #logger
  #options
  #results = new Map()    // id → result value
  #states = new Map()     // id → 'pending' | 'running' | 'success' | 'skipped' | 'failed'

  /**
   * 构造 SeedContext 实例
   *
   * Parameters:
   *   db(Object): Prisma 数据库客户端
   *   logger(Object): 日志记录器
   *   options(Object): 运行选项（dryRun、verbose 等）
   */
  constructor(db, logger, options) {
    this.#db = db
    this.#logger = logger
    this.#options = options || {}
  }

  // ——— 便捷访问 ———

  get db() { return this.#db }
  get logger() { return this.#logger }
  get options() { return this.#options }

  // ——— 结果存取 ———

  /**
   * 设置模块执行结果，并标记状态为 success
   *
   * Parameters:
   *   id(string): 模块 ID
   *   result(any): 模块执行结果
   */
  setResult(id, result) {
    this.#results.set(id, result)
    this.#states.set(id, 'success')
  }

  /**
   * 获取模块执行结果
   * 根据依赖模块的状态返回结果或抛出明确错误
   *
   * Parameters:
   *   id(string): 模块 ID
   *
   * Returns:
   *   result(any): 模块执行结果
   *
   * Throws:
   *   Error: 依赖被跳过、失败、未执行或不存在时抛出
   */
  getResult(id) {
    const state = this.#states.get(id)

    // 依赖不存在
    if (state === undefined) {
      throw new Error(`Unknown dependency '${id}'. No module with this ID has been registered.`)
    }

    // 依赖已执行成功 → 返回 result（可能为 undefined/null，透传）
    if (state === 'success') {
      return this.#results.get(id)
    }

    // 依赖被跳过
    if (state === 'skipped') {
      throw new Error(`Dependency '${id}' was skipped (plugin disabled or filtered out).`)
    }

    // 依赖失败
    if (state === 'failed') {
      throw new Error(`Dependency '${id}' failed. Cannot proceed with dependent modules.`)
    }

    // 依赖未执行（pending 或 running）
    if (state === 'pending' || state === 'running') {
      throw new Error(`Dependency '${id}' has not been executed yet (state: ${state}). Check execution order.`)
    }

    throw new Error(`Dependency '${id}' has unexpected state: ${state}`)
  }

  // ——— 状态管理 ———

  /**
   * 设置模块执行状态
   *
   * Parameters:
   *   id(string): 模块 ID
   *   state(string): 状态值（pending/running/success/skipped/failed）
   */
  setState(id, state) {
    this.#states.set(id, state)
  }

  /**
   * 获取模块执行状态
   *
   * Parameters:
   *   id(string): 模块 ID
   *
   * Returns:
   *   state(string|undefined): 模块状态
   */
  getState(id) {
    return this.#states.get(id)
  }
}
