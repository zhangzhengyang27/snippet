import { useMediaQuery } from '@vueuse/core'

/**
 * 移动端断点检测：手机(<640px) / 平板(640-1024px) / 桌面(>1024px)。
 *
 * 基于 matchMedia 响应式监听（底层为 window.matchMedia + change 事件，
 * 避免 resize 高频监听），供布局组件切换抽屉 / Bottom Sheet 等移动端形态。
 * 断点对齐 Tailwind v4 默认（sm=640 / lg=1024）。
 */
export function useIsMobile() {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  /** 手机或平板（<1024px），即非桌面——用于移动端形态切换 */
  const isCompact = useMediaQuery('(max-width: 1023px)')

  return {
    isMobile,
    isTablet,
    isDesktop,
    isCompact,
  }
}
