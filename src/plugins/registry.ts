/**
 * Function: isPluginEnabled
 *
 * Description: 检查指定插件是否已启用（通过环境变量控制）。
 *   ⚠️ 此函数只能在 Server Components / Route Handlers / Server Actions 中使用。
 *   因为它读取 process.env.PLUGIN_*，无法在 Client Components 中直接调用。
 *   Client Components 需要通过 Server Component 的 props 接收 enabledPlugins 对象。
 *
 * Parameters:
 *   pluginName(string): 插件名称（如 'wechat', 'ecommerce', 'promotion'）
 *
 * Returns:
 *   boolean: 插件是否启用
 */
export function isPluginEnabled(pluginName: string): boolean {
  const envMap: Record<string, string> = {
    wechat: 'PLUGIN_WECHAT',
    ecommerce: 'PLUGIN_ECOMMERCE',
    promotion: 'PLUGIN_PROMOTION',
  };
  const envKey = envMap[pluginName];
  return envKey ? process.env[envKey] === 'true' : false;
}

/**
 * Function: getEnabledPlugins
 *
 * Description: 获取所有插件的启用状态映射。
 *   用于 Server Component 向 Client Component 传递插件状态。
 *
 * Returns:
 *   Record<string, boolean>: 插件名称 → 启用状态映射
 */
export function getEnabledPlugins(): Record<string, boolean> {
  return {
    wechat: isPluginEnabled('wechat'),
    ecommerce: isPluginEnabled('ecommerce'),
    promotion: isPluginEnabled('promotion'),
  };
}
