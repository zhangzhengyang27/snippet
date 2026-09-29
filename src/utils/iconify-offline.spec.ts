/**
 * 离线图标回归测试。
 *
 * 背景：@iconify/vue 的 <Icon> 组件在本地图标存储里找不到图标时，会回退到向
 * Iconify 公共 API（api.iconify.design）发起网络请求。离线 / 内网环境下这会
 * 表现为**图标全部空白，且不报任何错**——属于典型的静默失效，很难在开发环境
 * 里被发现（开发者本机通常能联网）。
 *
 * 本测试把「源码里用到的每个图标名都能在本地存储解析」固化成断言：
 * - 若新增了图标但忘了跑 `npm run icons:build`，这里会失败；
 * - 若图标名拼错，生成脚本本身会先报错（不会走到这里）；
 * - 若 @iconify/vue 的 addCollection 行为变化，这里也能兜住。
 */
import { describe, expect, it } from 'vitest'
import { getIcon, iconExists } from '@iconify/vue'
import { ICON_NAMES } from '@/generated/iconify-offline'

describe('iconify 离线图标', () => {
  it('清单非空且无重复项', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0)
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
  })

  it('每个图标都能在本地存储中解析（不依赖网络）', () => {
    const missing = ICON_NAMES.filter((name) => !iconExists(name))
    expect(missing, `以下图标未注入本地存储，离线环境会渲染空白：${missing.join(', ')}`).toEqual([])
  })

  it('每个图标都有可渲染的 body', () => {
    const broken = ICON_NAMES.filter((name) => {
      const data = getIcon(name)
      return !data || typeof data.body !== 'string' || data.body.length === 0
    })
    expect(broken, `以下图标数据缺少 body：${broken.join(', ')}`).toEqual([])
  })

  it('图标名都带命名空间前缀', () => {
    const malformed = ICON_NAMES.filter((name) => !/^[a-z0-9-]+:[a-z0-9-]+$/.test(name))
    expect(malformed).toEqual([])
  })
})
