<template>
  <view class="checkin-page">
    <!-- ========== NavBar ========== -->
    <NavBar title="每日签到" />

    <!-- ========== 签到状态卡片 ========== -->
    <view class="status-card">
      <view class="status-stats">
        <view class="stat-block">
          <text class="stat-number">{{ status.streakDays }}</text>
          <text class="stat-label">连续签到（天）</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-block">
          <text class="stat-number">{{ status.totalDays }}</text>
          <text class="stat-label">累计签到（天）</text>
        </view>
      </view>
      <!-- 签到按钮 -->
      <view
        :class="['checkin-btn', status.todayCheckedIn ? 'checkin-btn-disabled' : '']"
        hover-class="checkin-btn-hover"
        @tap="handleCheckin"
      >
        <text :class="['checkin-btn-text', status.todayCheckedIn ? 'checkin-btn-text-disabled' : '']">
          {{ status.todayCheckedIn ? '已签到' : '签到' }}
        </text>
      </view>
    </view>

    <!-- ========== 月度日历 ========== -->
    <view class="calendar-card">
      <!-- 月份导航 -->
      <view class="calendar-header">
        <view class="month-nav" hover-class="month-nav-hover" @tap="prevMonth">
          <text class="month-nav-arrow">‹</text>
        </view>
        <text class="month-title">{{ calendarTitle }}</text>
        <view class="month-nav" hover-class="month-nav-hover" @tap="nextMonth">
          <text class="month-nav-arrow">›</text>
        </view>
      </view>
      <!-- 星期标题行 -->
      <view class="weekday-row">
        <text
          v-for="(day, idx) in weekLabels"
          :key="'w-'+idx"
          class="weekday-label"
        >{{ day }}</text>
      </view>
      <!-- 日期网格 -->
      <view class="days-grid">
        <!-- 空白占位（月初偏移） -->
        <view v-for="n in firstDayOffset" :key="'empty-'+n" class="day-cell day-cell-empty" />
        <!-- 日期 -->
        <view
          v-for="(dayInfo, idx) in calendarDays"
          :key="'d-'+idx"
          :class="dayCellClass(dayInfo)"
          class="day-cell"
        >
          <text
            :class="dayTextClass(dayInfo)"
            class="day-text"
          >{{ dayInfo.day }}</text>
          <!-- 签到标记：绿色小圆点 -->
          <view v-if="dayInfo.isChecked" class="checkin-dot" />
        </view>
      </view>
    </view>

    <!-- ========== 连续签到奖励进度 ========== -->
    <view class="reward-card">
      <view class="reward-header">
        <text class="reward-title">连续签到奖励</text>
        <text class="reward-desc">连续签到 7 天可获取额外积分</text>
      </view>
      <view class="reward-progress-bar">
        <view
          class="reward-progress-fill"
          :style="{ width: rewardProgressPercent + '%' }"
        />
      </view>
      <view class="reward-steps">
        <view
          v-for="(step, idx) in rewardSteps"
          :key="'rs-'+idx"
          class="reward-step"
        >
          <view :class="['reward-step-dot', status.streakDays >= step ? 'reward-step-dot-done' : '']" />
          <text class="reward-step-label">{{ step }}天</text>
        </view>
      </view>
    </view>

    <!-- ========== 签到获得的积分展示 ========== -->
    <view v-if="earnedPoints > 0" class="points-card">
      <text class="points-icon">🎁</text>
      <text class="points-text">本次签到获得 <text class="points-number">{{ earnedPoints }}</text> 积分</text>
    </view>

    <!-- ========== 底部占位 ========== -->
    <view class="bottom-placeholder" />
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from 'vue'
import { checkinService } from '@/services/checkin'
import type { CheckinStatus, CheckinHistory } from '@/services/checkin'
import { BusinessError } from '@/utils/error-handler'
import { showSuccess, showError, showText } from '@/utils/toast'
import { logger } from '@/utils/logger'
import { storage } from '@/utils/storage'
import { StorageKey } from '@/config/constants'

// 星期标签（周一到周日）
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// 连续签到奖励阶梯（天数）
const REWARD_STEPS = [1, 2, 3, 4, 5, 6, 7]

export default {
  /**
   * 下拉刷新：重新加载签到状态和当前月份历史
   */
  onPullDownRefresh() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    Promise.all([
      currentPage?.loadCheckinStatus?.() ?? Promise.resolve(),
      currentPage?.loadMonthHistory?.() ?? Promise.resolve(),
    ]).finally(() => {
      uni.stopPullDownRefresh()
    })
  },

  setup() {
    // ====== 签到状态 ======
    const status = ref<CheckinStatus>({
      todayCheckedIn: false,
      streakDays: 0,
      totalDays: 0,
      lastCheckinDate: null,
    })

    // ====== 本次签到获得的积分 ======
    const earnedPoints = ref(0)

    // ====== 日历相关状态 ======
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-based
    const currentDay = now.getDate()

    // 用户正在浏览的年月（可切换）
    const viewYear = ref(currentYear)
    const viewMonth = ref(currentMonth) // 0-based

    // 签到历史：已签到日期的 Set，便于快速查找
    const checkedDays = ref<Set<string>>(new Set())

    // ====== 星期标签 ======
    const weekLabels = ref(WEEK_LABELS)

    // ====== 计算属性：日历标题 ======
    const calendarTitle = computed(() => {
      return `${viewYear.value}年${viewMonth.value + 1}月`
    })

    // ====== 计算属性：月初偏移（周一起始） ======
    // getDay() 返回 0(周日)~6(周六)，转换为周一起始：0(周一)~6(周日)
    const firstDayOffset = computed(() => {
      const firstDay = new Date(viewYear.value, viewMonth.value, 1).getDay()
      // 周一为 0：周一=0, 周二=1, ..., 周日=6
      return firstDay === 0 ? 6 : firstDay - 1
    })

    // ====== 计算属性：日历天数列表 ======
    const calendarDays = computed(() => {
      const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
      const monthStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`
      const days: Array<{ day: number; isToday: boolean; isFuture: boolean; isChecked: boolean }> = []

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
        const isToday = (viewYear.value === currentYear && viewMonth.value === currentMonth && d === currentDay)
        const isFuture = (
          viewYear.value > currentYear ||
          (viewYear.value === currentYear && viewMonth.value > currentMonth) ||
          (viewYear.value === currentYear && viewMonth.value === currentMonth && d > currentDay)
        )
        days.push({
          day: d,
          isToday,
          isFuture,
          isChecked: checkedDays.value.has(dateStr),
        })
      }
      return days
    })

    // ====== 奖励阶梯 ======
    const rewardSteps = ref(REWARD_STEPS)

    // ====== 计算属性：奖励进度百分比 ======
    const rewardProgressPercent = computed(() => {
      const streak = status.value.streakDays
      // 进度 = min(streakDays, 7) / 7 * 100
      const percent = Math.min(streak, 7) / 7 * 100
      return percent
    })

    // ====== 日期单元格样式类 ======
    const dayCellClass = (dayInfo: { isToday: boolean; isChecked: boolean; isFuture: boolean }) => {
      const classes: string[] = ['day-cell']
      if (dayInfo.isToday) classes.push('day-cell-today')
      if (dayInfo.isChecked) classes.push('day-cell-checked')
      if (dayInfo.isFuture) classes.push('day-cell-future')
      return classes
    }

    // ====== 日期文字样式类 ======
    const dayTextClass = (dayInfo: { isToday: boolean; isChecked: boolean; isFuture: boolean }) => {
      const classes: string[] = ['day-text']
      if (dayInfo.isToday) classes.push('day-text-today')
      if (dayInfo.isChecked && !dayInfo.isToday) classes.push('day-text-checked')
      if (dayInfo.isFuture) classes.push('day-text-future')
      return classes
    }

    // ====== 加载签到状态 ======
    const loadCheckinStatus = async () => {
      try {
        const result = await checkinService.getCheckinStatus()
        status.value = result
      } catch (e) {
        logger.warn('获取签到状态失败', e)
      }
    }

    // ====== 加载指定月份签到历史 ======
    const loadMonthHistory = async () => {
      const monthStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`
      try {
        const history: CheckinHistory = await checkinService.getCheckinHistory(monthStr)
        checkedDays.value = new Set(history.days || [])
      } catch (e) {
        logger.warn('获取签到历史失败', e)
        checkedDays.value = new Set()
      }
    }

    // ====== 执行签到 ======
    const handleCheckin = async () => {
      if (status.value.todayCheckedIn) {
        showText('今日已签到')
        return
      }

      try {
        const result = await checkinService.checkin()
        // 签到成功，更新状态
        status.value.todayCheckedIn = true
        status.value.streakDays = result.streakDays
        status.value.totalDays += 1
        status.value.lastCheckinDate = new Date().toISOString()

        // 记录获得的积分
        if (result.reward?.points) {
          earnedPoints.value = result.reward.points
          showSuccess(`签到成功！+${result.reward.points} 积分`)
        } else {
          showSuccess('签到成功！')
        }

        // 刷新当前月份的签到历史
        await loadMonthHistory()
      } catch (e: any) {
        // 兼容多种错误来源：BusinessError(code)、普通 Error(message)
        const isAlreadyCheckedIn =
          (e instanceof BusinessError && e.code === 'ALREADY_CHECKED_IN') ||
          e?.message === '今日已签到'

        if (isAlreadyCheckedIn) {
          showText('今日已签到')
          status.value.todayCheckedIn = true
        } else if (e instanceof BusinessError && e.code === 'UNAUTHORIZED') {
          showError('请先登录后再签到')
        } else {
          logger.error('签到失败', e)
          showError('签到失败，请重试')
        }
      }
    }

    // ====== 月份导航 ======
    const prevMonth = () => {
      if (viewMonth.value === 0) {
        viewYear.value -= 1
        viewMonth.value = 11
      } else {
        viewMonth.value -= 1
      }
      loadMonthHistory()
    }

    const nextMonth = () => {
      // 不允许查看未来的月份
      if (viewYear.value === currentYear && viewMonth.value >= currentMonth) {
        return
      }
      if (viewMonth.value === 11) {
        viewYear.value += 1
        viewMonth.value = 0
      } else {
        viewMonth.value += 1
      }
      loadMonthHistory()
    }

    // ====== 生命周期 ======
    onMounted(async () => {
      // 未登录时提示并返回，避免触发 401 自动跳转首页
      const token = storage.get(StorageKey.ACCESS_TOKEN)
      if (!token) {
        showError('请先登录后再查看签到')
        setTimeout(() => {
          uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
        }, 1500)
        return
      }

      // 并行加载签到状态和当前月份历史
      await Promise.all([
        loadCheckinStatus(),
        loadMonthHistory(),
      ])
    })

    return {
      status,
      earnedPoints,
      calendarTitle,
      firstDayOffset,
      calendarDays,
      weekLabels,
      rewardSteps,
      rewardProgressPercent,
      dayCellClass,
      dayTextClass,
      loadCheckinStatus,
      loadMonthHistory,
      handleCheckin,
      prevMonth,
      nextMonth,
    }
  },
}
</script>

<style lang="scss" scoped>

/* ========== 页面容器 ========== */
.checkin-page {
  min-height: 100vh;
  background-color: #F5F7F6;
}

/* ========== 签到状态卡片 ========== */
.status-card {
  margin: 20rpx 40rpx;
  padding: 48rpx 40rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.status-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
  width: 100%;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  .stat-number {
    font-family: 'JetBrains Mono', system-ui, sans-serif;
    font-size: 80rpx;
    font-weight: 800;
    color: #1A2E35;
    line-height: 96rpx;
  }

  .stat-label {
    font-size: 24rpx;
    color: #6B8A94;
    line-height: 32rpx;
  }
}

.stat-divider {
  width: 2rpx;
  height: 80rpx;
  background-color: #E2EBED;
}

/* ========== 签到按钮 ========== */
.checkin-btn {
  width: 280rpx;
  height: 88rpx;
  background-color: #009666;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .checkin-btn-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #FFFFFF;
    line-height: 40rpx;
  }
}

.checkin-btn-disabled {
  background-color: #E2EBED;

  .checkin-btn-text-disabled {
    color: #6B8A94;
  }
}

.checkin-btn-hover {
  opacity: 0.85;
}

/* ========== 月度日历卡片 ========== */
.calendar-card {
  margin: 0 40rpx 24rpx;
  padding: 32rpx 24rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 24rpx;
}

.month-nav {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #F5F7F6;
  display: flex;
  align-items: center;
  justify-content: center;

  .month-nav-arrow {
    font-size: 28rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 36rpx;
  }
}

.month-nav-hover {
  opacity: 0.7;
}

.month-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A2E35;
  line-height: 44rpx;
}

/* ========== 星期标题行 ========== */
.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 16rpx;

  .weekday-label {
    text-align: center;
    font-size: 22rpx;
    font-weight: 500;
    color: #6B8A94;
    line-height: 28rpx;
  }
}

/* ========== 日期网格 ========== */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx 0;
}

.day-cell {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.day-cell-empty {
  /* 空白占位，无样式 */
}

.day-cell-today {
  border: 4rpx solid #009666;
  box-sizing: border-box;
}

.day-cell-checked {
  background-color: #E8F7F0;
}

.day-cell-future {
  /* 未来日期，文字灰色 */
}

.day-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #1A2E35;
  line-height: 34rpx;
}

.day-text-today {
  font-weight: 700;
  color: #009666;
}

.day-text-checked {
  color: #009666;
}

.day-text-future {
  color: #C4D3D8;
}

/* 签到标记小圆点 */
.checkin-dot {
  position: absolute;
  bottom: 6rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background-color: #009666;
}

/* ========== 连续签到奖励进度 ========== */
.reward-card {
  margin: 0 40rpx 24rpx;
  padding: 32rpx 32rpx 28rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
}

.reward-header {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-bottom: 24rpx;

  .reward-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 40rpx;
  }

  .reward-desc {
    font-size: 22rpx;
    color: #6B8A94;
    line-height: 30rpx;
  }
}

.reward-progress-bar {
  height: 16rpx;
  background-color: #F5F7F6;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 20rpx;

  .reward-progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #009666, #00B87A);
    border-radius: 8rpx;
    transition: width 0.4s ease;
  }
}

.reward-steps {
  display: flex;
  justify-content: space-between;

  .reward-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }

  .reward-step-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background-color: #E2EBED;
  }

  .reward-step-dot-done {
    background-color: #009666;
  }

  .reward-step-label {
    font-size: 18rpx;
    font-weight: 500;
    color: #6B8A94;
    line-height: 24rpx;
  }
}

/* ========== 积分展示卡片 ========== */
.points-card {
  margin: 0 40rpx 24rpx;
  padding: 28rpx 32rpx;
  background-color: #E8F7F0;
  border: 2rpx solid #B8E6D0;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;

  .points-icon {
    font-size: 40rpx;
    line-height: 48rpx;
  }

  .points-text {
    font-size: 26rpx;
    color: #1A2E35;
    line-height: 36rpx;
  }

  .points-number {
    font-family: 'JetBrains Mono', system-ui, sans-serif;
    font-weight: 700;
    color: #009666;
  }
}

/* ========== 底部占位 ========== */
.bottom-placeholder {
  height: 48rpx;
}
</style>
