/**
 * AppInput 模板契约测试（源码级）。
 *
 * 为什么不用挂载测试：AppInput 内部是 <el-input>，unplugin 自动导入在 vitest 下不生效，
 * 组件无法真正渲染，而这条契约恰恰只存在于「传给 el-input 的属性组合」里。
 *
 * 守的是什么（一，实测复现过的静默失效）：
 *   el-input 的 `clearable` 与自绘的 `#suffix` 清空钮**会同时渲染** ——
 *   EP 原生那个在 hover 时可见（源码 input.vue 里 `showClear` 参与
 *   `suffixVisible` 判定），于是同一个输入框里并排出现两个 ✕，
 *   不报错、不影响功能，只有肉眼能发现。
 *   2026-09-30 已在浏览器确认：去掉 `clearable` 后清空钮从 2 个变 1 个。
 *   因此：allowClear 只允许通过 `#suffix` 表达，禁止再传 `clearable`。
 *
 * 守的是什么（二）：`#prefix` 已按项目决策**移除**（2026-09-30），不要再加回透传。
 *   需要前缀图标的调用方自理（本仓库唯一用例 SnippetsToolbar 搜索框用绝对定位图标）。
 *   注意与前一条区分：不是所有转发都禁止，只是这两个具体口子不开。
 *
 * 守的是什么（三）：**不要做全插槽转发**。`suffix` 被本组件消费（自绘清空钮），
 *   若照 `AppButton` 的全量转发写法会与之冲突。
 *
 * ⚠️ 断言一律只看**代码行**（`code()`）——本文件顶部的注释为了说明缘由，会原样引用
 *    `clearable` / `#prefix` 等字符串，不过滤注释必然误报（这次就踩到过）。
 */
import { describe, expect, it } from 'vitest'
import source from './AppInput.vue?raw'

/** 去掉注释行后的源码；契约断言只应作用于代码 */
const code = () =>
  source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
    .join('\n')

describe('AppInput 模板契约', () => {
  it('不向 el-input 传 clearable（会与 #suffix 自绘清空钮重复渲染）', () => {
    const attributeUses = code()
      .split('\n')
      .filter((line) => /[:@]?clearable/.test(line))

    expect(attributeUses).toEqual([])
  })

  it('allowClear 由 #suffix 插槽承载，且带上可访问名', () => {
    expect(source).toContain('allowClear')
    expect(source).toMatch(/#suffix/)
    expect(source).toMatch(/aria-label="清空"/)
  })

  it('不转发 #prefix（2026-09-30 决策移除，调用方自理前缀图标）', () => {
    expect(code()).not.toMatch(/#prefix/)
  })

  it('不做全插槽转发（suffix 被本组件消费，全量转发会与清空钮冲突）', () => {
    expect(code()).not.toMatch(/v-for="\(_, name\) in \$slots"/)
    expect(source).toMatch(/#suffix/)
  })
})
