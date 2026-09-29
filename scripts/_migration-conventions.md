# 桌面组件迁移规范（给迁移子代理参考）

把 `web-widgets` 源项目的桌面组件迁移到 `/Users/xiaoye/Desktop/html5-examples`（Vue 3 + Vite + TS + Tailwind v4 + SCSS）。
迁移后的组件放在 `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/<name>/`。

源项目组件目录：`/Users/xiaoye/Desktop/待处理的项目/widgets/src/widgets/<name>/`

## 必读参考文件（先读，对齐风格）
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/todo-list/TodoListWidget.vue` —— 标杆：原生控件、element-plus 图标、useWidget 的 TDZ 安全写法、组件内 edit/add UI。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/todo-list/model/TodoListData.ts` —— 标杆：WidgetData 子类 + parseJSON/toObject + 自定义 Todo 类重建。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/todo-list/components/TodoItem.vue` 与 `EditBox.vue` —— 标杆：原生控件样式。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/clock/ClockWidget.vue` —— 标杆：图片资源、useIntervalFn、preview 块。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/web/`（WidgetData.ts / WidgetParams.ts / useWidget.ts / WidgetDataApi.ts / color.ts / index.ts）—— 必须使用的适配层。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/registry.ts` —— 元信息形状与 clock/todo-list 注册方式（你只写 fragment，不要改它）。
- `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/_controls.css` —— 已全局引入的 `.dw-*` 控件类（直接用，不要重定义）。

## 硬规则

### 1. Element Plus 不可用
目标项目没有全局注册 Element Plus，任何 `<El*>`/`<el-*>`/`ElMessage` 运行时会 undefined。用全局 `.dw-*` 类替代（已定义，直接加 class，**不要**自己写这些类的样式）：
- `el-button` → `<button class="dw-btn">` / `dw-btn dw-btn--primary` / `dw-btn dw-btn--danger`
- `el-input`(文本) → `<input class="dw-input" />`；多行 → `<textarea class="dw-textarea">`
- `el-input-number` → `<input type="number" class="dw-number" />`
- `el-color-picker` → `<input type="color" class="dw-color" />`
- `el-switch` → `<button type="button" class="dw-switch" :class="{ 'is-on': on }" @click="on = !on"></button>`（绑定布尔 ref）
- `el-radio-group`/`el-radio` → `<label class="dw-radio"><input type="radio" /> 文字</label>`
- `el-checkbox-group`/`el-checkbox` → `<label class="dw-checkbox"><input type="checkbox" /> 文字</label>`
- `el-table`/`el-table-column` → 原生 `<table class="dw-table"><thead><tr><th>..</th></tr></thead><tbody><tr><td>..</td></tr></tbody></table>`
- `el-form`/`el-form-item` → `<div class="dw-field"><label>..</label><控件></div>`
- `el-slider` → `<input type="range" class="dw-range" :min :max :step />`
- `el-date-picker`(date) → `<input type="date" class="dw-input" />`；(datetime) → `<input type="datetime-local" class="dw-input" />`
- `el-time-picker` → `<input type="time" class="dw-input" />`
- `el-avatar` → `<img class="dw-avatar" :src="..." />`
- `el-tooltip` → 元素上加 `title="..."`
- `el-alert` → `<div class="dw-alert">..</div>`
- `el-progress` → `<div class="dw-progress"><div class="dw-progress__bar" :style="{ width: pct + '%' }"></div></div>`
- `el-carousel`/`el-carousel-item` → 用 `.dw-carousel` 模式：一个 div 用 index ref 显示一张图，配 prev/next 按钮（见 photo 组件说明）。
完成后 `grep -rn "el-\|<El\|ElMessage\|ElNotification\|ElMessageBox" <你的文件>` 必须无结果。

### 2. 图标
源用 `@icon-park/vue-next`（`mgc_*` 组件导入 + 字体 class 字符串）。全部换成 `@element-plus/icons-vue`：
- 组件导入：`import { Plus, Refresh } from '@icon-park/vue-next'` → `import { Plus, Refresh } from '@element-plus/icons-vue'`。
- 字体 class 字符串（用在 `:icon` 或动态名）：映射到合理的 Element Plus 图标组件名字符串，例如 `mgc_add_circle_line`→`'Plus'`/`'CirclePlus'`、`mgc_cake_line`→`'Cake'`、`mgc_left_line`→`'ArrowLeft'`、`mgc_right_line`→`'ArrowRight'`、`mgc_close_line`→`'Close'`、`mgc_minimize_line`→`'Minus'`、`mgc_shuffle_line`→`'MagicStick'`、`mgc_pause_line`→`'VideoPause'`、`mgc_volume_line`→`'Microphone'`、`mgc_document_2_line`→`'Document'`、`mgc_headphone_line`→`'Headset'`。然后 `<component :is="iconName" />` 或直接 import 具体图标使用。
- 禁止 import `@icon-park/vue-next` 或其 CSS。`grep` 必须无 `icon-park`。

### 3. color 包
源 `import Color from 'color'` → `import { withAlpha, darken, lighten } from '@/desktop-widgets/web'`：
- `Color(hex).alpha(a).toString()` → `withAlpha(hex, a)`（返回 `rgba(r,g,b,a)`）
- `Color(hex).darken(r).toString()` → `darken(hex, r)`（返回 `rgb(r,g,b)`）
- `Color(hex).lighten(r).toString()` → `lighten(hex, r)`（返回 `rgb(r,g,b)`）
- **注意**：`darken`/`lighten` 只解析 hex（`#` 开头）。不要把它套在 `rgba()` 字符串上。需要「先加深再透明」时写成 `withAlpha(darken(hex, r), a)`（先对 hex 算，最后加 alpha）。
完成后 `grep -rn "from 'color'\|require('color')" <你的文件>` 必须无结果。

### 4. lodash
- `remove(arr, pred)` → `filter` / `findIndex`+`splice` / 重赋值。
- `delay(fn, ms)` → `setTimeout(fn, ms)`。
- `floor(x)` → `Math.floor(x)`。
- `debounce(fn, ms)` → `@vueuse/core` 的 `useDebounceFn(fn, ms)` 或简单 timeout。
目标无 lodash。`grep` 必须无 `lodash`。

### 5. WidgetData 子类（强制）
每个迁移组件**必须**有自己的 `WidgetData` 子类（localStorage key = 类名，避免互相覆盖）。即使源用了基类，也要建如 `GlitchData extends WidgetData`。模板（仿 TodoListData）：
```ts
import { WidgetData } from '@/desktop-widgets/web'
export class GlitchData extends WidgetData {
  text: string = 'Hello'
  constructor() { super('glitch') }
  parseJSON(json: Record<string, any>): void {
    super.parseJSON(json) // 简单字段自动赋值
    // 若字段是带方法的自定义类（如 Todo），在此重建实例
  }
}
```
模型文件放 `<name>/model/<Name>Data.ts`。若模型含带方法的自定义类，需在 parseJSON 重建（参考 TodoListData.ts）。

### 6. useWidget（TDZ 安全，关键）
```ts
const { widgetData, widgetParams } = useWidget(MyData, {
  onDataLoaded: (data) => {
    // 必须用参数 data，禁止引用外层 widgetData（TDZ 白屏）
    list.value = data?.items ?? []
  }
})
```
保留 `if (widgetParams.preview) { ...演示数据... }` 块（无害，画廊不会传 preview）。

### 7. 配置面板
目标 `DesktopWidgetPage` **已提供**通用外观配置（背景色/主题色/圆角/宽高）并自动持久化。**不要**创建独立的 `*ConfigView.vue`/`*Config.vue`。改为：
- 若组件需编辑自身数据（如倒计时目标日期、生日名单、提醒项），在**组件内部**做小型设置 UI（齿轮按钮切换编辑面板，仿 todo-list 的 viewType 切换），保持可用即可。
- 外观（bg/color/radius/size）由外部面板处理；组件从 props 读取 `backgroundColor`/`color`/`borderRadius` 并应用到根元素（用 `defineProps` 定义，像 todo-list 那样）。

### 8. Widget props
组件会收到 `backgroundColor`、`color`、`borderRadius`、`width`、`height` 作为 props（来自 DesktopWidgetPage）。在 `defineProps` 定义并给默认值，应用到根元素（background-color / border-radius）。用 scoped style 里 `v-bind()` 或内联 `:style`。

### 9. 桌面宿主 API（必须删除/降级）
源可能 import `@/web` 宿主辅助及全局 `BrowserWindowApi`/`DeviceApi`/`ElectronUtils`/`HostedWidgetApi`/`useKeyboardEventHook`/`useNotification`/`NotificationApi`/`useAppBroadcast`/`BroadcastEvent`/`WidgetApiEvent`/`WidgetApi`/`useWidgetApi`/`WidgetFitBox`/`useWidgetScale`。目标都不存在，替换：
- `useNotification`/`NotificationApi.send` → 项目 `toast`（`import { toast } from '@/composables/useToast'`）或浏览器 `Notification`（`if ('Notification' in window)`）；桌面依赖组件用 no-op 也行。
- `BrowserWindowApi.openUrl(url)` → `window.open(url, '_blank')`；其他 `BrowserWindowApi.*` → 删除（no-op）。
- `DeviceApi.getCursorScreenPoint` → 删除。
- `ElectronUtils.hasElectronApi()` → 直接走非 electron 分支（或 `false`）。
- `HostedWidgetApi.removeHostedWidget()`/`openConfigRoute()` → 删除/no-op。
- `useAppBroadcast`/`BroadcastEvent`/`WidgetApiEvent`/`WidgetApi`(事件) → 删除/no-op。
- `useKeyboardEventHook(...)` → `onMounted` 里 `window.addEventListener('keydown', handler)`，`onUnmounted` 里 `removeEventListener`。
- `WidgetApi.getWidgetPackageUrl`/`IndexUrl`/`getWidgetConfigUrl` → 相对/静态路径或删除。
- `WidgetFitBox`/`useWidgetScale` → 用 CSS `transform: scale()` 包裹，或直接让组件自适应容器（目标已按舞台尺寸定容器大小）。
- `useWidgetApi` → 用 `@/desktop-widgets/web` 的 `WidgetDataApi`。
完成后 `grep -rn "BrowserWindowApi\|DeviceApi\|ElectronUtils\|HostedWidgetApi\|useKeyboardEventHook\|useNotification\|NotificationApi\|useAppBroadcast\|BroadcastEvent\|WidgetApiEvent\|WidgetFitBox\|useWidgetScale\|@/web\|@widget-js" <你的文件>` 必须为空（你可以从 `@/desktop-widgets/web` 引入）。

### 10. 资源
- 组件本地图片（`src/widgets/<name>/images/` 或 `assets/`）→ 复制到 `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/widgets/<name>/images/`，组件内用相对 `./images/xxx.png` 引用。
- 源 `public/` 资源（`public/audio/*`、`public/images/*`）→ 复制到 `/Users/xiaoye/Desktop/html5-examples/public/desktop-widgets/<name>/`，用绝对 `/desktop-widgets/<name>/file` 引用。
- 内联 `data:image/svg+xml` → 保留内联。
- `.txt` 用 `?raw` 导入 → 保留 `import txt from './x.txt?raw'`（Vite 支持）。
用 Bash `cp` 真实复制文件（不要只引用）。

### 11. 样式
保留源视觉逻辑。用 `<style scoped lang="scss">`。可用 volt 变量也可保留源自带 hex/rgba。不要 import Element Plus 主题。

### 12. 注册 fragment
创建完文件后，写 fragment 到 `/Users/xiaoye/Desktop/html5-examples/src/desktop-widgets/registry-fragment-<BATCH>.ts`：
```ts
import type { DesktopWidgetMeta } from './registry'
import GlitchWidget from './widgets/glitch/GlitchWidget.vue'
import { GlitchData } from './widgets/glitch/model/GlitchData'

export const batchXWidgets: DesktopWidgetMeta[] = [
  {
    name: 'glitch',
    title: '故障文字',
    description: '简短中文描述',
    icon: 'gesture', // Material Symbols 名（AppIcon ms: 前缀），挑合理的；不确定用 'widgets'
    component: GlitchWidget,
    dataClass: GlitchData,
    defaultData: () => new GlitchData(),
    defaultSize: { width: 300, height: 200 }
  }
]
```

### 13. 不要改
除在 `src/desktop-widgets/widgets/<name>/` 下新建文件、复制资源、写 `registry-fragment-<BATCH>.ts` 外，**不要修改** `registry.ts` 主数组或其他既有文件。

### 14. TypeScript
项目 strict。尽量类型化（少量 `any` 作为 warning 可被容忍，但优先类型）。确保 import 解析：`@/desktop-widgets/web`（适配层）、`@/composables/useToast`（toast）、`@element-plus/icons-vue`（图标）、`@vueuse/core`（composable）。

### 15. 自检
逐个重读创建的 .vue/.ts，确认无残留 `El`/`el-`/`icon-park`/`color`/`lodash`/宿主 API，并用上述 grep 验证。

## 输出
创建全部组件文件 + 资源 + 注册 fragment。汇报：完成了哪些、哪些做了简化、遗留风险。**不要**启动 dev server 或跑 eslint（由协调者统一做）。
