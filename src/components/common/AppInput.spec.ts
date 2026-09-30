/**
 * AppInput 模板契约测试（源码级）。
 *
 * 为什么不用挂载测试：AppInput 内部是 <el-input>，unplugin 自动导入在 vitest 下不生效，
 * 组件无法真正渲染，而这条契约恰恰只存在于「传给 el-input 的属性组合」里。
 *
 * 守的是什么（实测复现过的静默失效）：
 *   el-input 的 `clearable` 与自绘的 `#suffix` 清空钮**会同时渲染** ——
 *   EP 原生那个在 hover 时可见（源码 input.vue 里 `showClear` 参与
 *   `suffixVisible` 判定），于是同一个输入框里并排出现两个 ✕，
 *   不报错、不影响功能，只有肉眼能发现。
 *   2026-09-30 已在浏览器确认：去掉 `clearable` 后清空钮从 2 个变 1 个。
 *
 * 因此：allowClear 只允许通过 `#suffix` 表达，禁止再传 `clearable`。
 */
import { describe, expect, it } from 'vitest'
import source from './AppInput.vue?raw'

describe('AppInput 模板契约', () => {
  it('不向 el-input 传 clearable（会与 #suffix 自绘清空钮重复渲染）', () => {
    // 只允许出现在注释里说明「为什么不能传」，不允许出现在标签属性位置
    const attributeUses = source
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
      .filter((line) => /[:@]?clearable/.test(line))

    expect(attributeUses).toEqual([])
  })

  it('allowClear 由 #suffix 插槽承载，且带上可访问名', () => {
    expect(source).toContain('allowClear')
    expect(source).toMatch(/#suffix/)
    expect(source).toMatch(/aria-label="清空"/)
  })

  it('prefix / suffix 插槽都要透传（回归锁：曾经漏带 group 导致变色失效）', () => {
    expect(source).toMatch(/#prefix/)
    expect(source).toMatch(/\$slots\.prefix/)
  })
})
