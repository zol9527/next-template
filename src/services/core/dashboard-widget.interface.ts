/**
 * Function: DashboardWidget
 *
 * Description: 仪表盘小组件接口。
 *   业务插件可注册自己的 Dashboard 组件来提供统计数据。
 *
 * Properties:
 *   id(string): 唯一标识
 *   name(string): 显示名称
 *   fetchData(): 获取数据的方法
 */
export interface DashboardWidget {
	id: string
	name: string
	fetchData(): Promise<Record<string, any>>
}

/**
 * Function: DashboardWidgetRegistry
 *
 * Description: 仪表盘组件注册表。
 *   每次 service 实例化时应创建独立的 registry 实例，避免跨请求状态污染。
 */
export class DashboardWidgetRegistry {
	private widgets: DashboardWidget[] = []

	register(widget: DashboardWidget): void {
		this.widgets.push(widget)
	}

	getWidgets(): DashboardWidget[] {
		return [...this.widgets]
	}

	/**
	 * Function: fetchAll
	 *
	 * Description: 获取所有注册组件的数据，返回以 widget id 为 key 的映射
	 *
	 * Returns:
	 *   result(Record<string, any>): 各组件数据的映射，失败时对应值为 { error: string }
	 */
	async fetchAll(): Promise<Record<string, any>> {
		const result: Record<string, any> = {}
		for (const widget of this.widgets) {
			try {
				result[widget.id] = await widget.fetchData()
			} catch (error) {
				result[widget.id] = { error: 'Failed to fetch data' }
			}
		}
		return result
	}
}
