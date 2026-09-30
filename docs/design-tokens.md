# Design Tokens — Linear 设计体系

> 本文档固化 `snippet` 项目当前的设计 token 体系来源与映射。
> 参照来源：[design.hagicode.com/zh-CN/designs/linear.app/](https://design.hagicode.com/zh-CN/designs/linear.app/)
> 角色命名沿用 Material Design 3 (M3) 语义结构（primary / secondary / tertiary / container / surface），色值取自 Linear 真实调色板。

## 1. 设计来源决策

| 维度 | 取值 | 说明 |
|---|---|---|
| 语义角色结构 | Material Design 3 (M3) | `primary/secondary/tertiary` + `*-container`、`surface/surface-dim/surface-bright/surface-variant` |
| 具体色值 | **Linear** | 品牌 indigo `#5e6ad2`、Accent Violet `#7170ff/#828fff`、Marketing Black `#08090a`、emerald `#10b981` |
| 圆角刻度 | **Linear** | 2 / 5 / 6 / 8 / 12 / 22px + pill |
| 间距刻度 | **Linear** (4px 栅格 + 7/11/19 偏移) | `--space-1..12` |
| 字号刻度 | **Linear** (Inter 唯一字族) | Display 72/64/48、H1 32、H2 24、H3 20、Body 16/15、code 14/12 |
| 字体 | **Inter** (Google Fonts 真实加载) | 代码块用 JetBrains Mono（Berkeley Mono 付费替身） |

## 2. 颜色 Token

所有颜色以 `*-rgb` 三元组定义于 `:root` / `.dark`，运行时由复合变量 `rgb(var(--color-xxx-rgb))` 解析（随主题切换）。

### 2.1 品牌 / 强调

| Token | Light | Dark | Linear 角色 |
|---|---|---|---|
| `--color-primary` | `#5e6ad2` (94 106 210) | `#7170ff` (113 112 255) | Brand indigo / brighter violet on dark |
| `--color-primary-container` | `#7170ff` (113 112 255) | `#828fff` (130 143 255) | Accent Violet |
| `--color-secondary` | `#7170ff` (113 112 255) | `#828fff` (130 143 255) | 渐变停点 |
| `--color-secondary-container` | `#828fff` (130 143 255) | `#7170ff` (113 112 255) | Accent Hover |
| `--color-tertiary` | `#828fff` (130 143 255) | `#7170ff` (113 112 255) | 点缀 |
| `--color-brand` | = primary | = primary(dark) | 同 primary |

### 2.2 表面 / 背景 / 边框

| Token | Light | Dark | Linear 角色 |
|---|---|---|---|
| `--color-background` | `#f7f8f8` (247 248 248) | `#08090a` (8 9 10) | Light page bg / Marketing Black |
| `--color-surface` | `#ffffff` (255 255 255) | `#191a1b` (25 26 27) | Card surface |
| `--color-surface-dim` | `#f5f6f7` (245 246 247) | `#0f1011` (15 16 17) | Panel Dark |
| `--color-surface-bright` | `#ffffff` | `#23252a` (35 37 42) | Elevated |
| `--color-surface-variant` | `#f7f8f8` (247 248 248) | `#23252a` (35 37 42) | Variant |
| `--color-surface-variant-high` | `#f3f4f5` (243 244 245) | `#34343a` (52 53 58) | High variant |
| `--color-border` | `#d0d6e0` (208 214 224) | `#34343a` (52 53 58) | Border |
| `--color-border-glass` | `#d0d6e0` (208 214 224) | `#34343a` (52 53 58) | Glass border |

### 2.3 文字

| Token | Light | Dark |
|---|---|---|
| `--color-text` | `#08090a` (8 9 10) | `#f7f8f8` (247 248 248) |
| `--color-text-secondary` | `#62666d` (98 102 109) | `#d0d6e0` (208 214 224) |
| `--color-text-tertiary` | `#8a8f98` (138 143 152) | `#8a8f98` (138 143 152) |

### 2.4 语义状态色

| Token | Light | Dark | 来源 |
|---|---|---|---|
| `--color-success` | `#10b981` (16 185 129) | `#10b981` | Linear emerald |
| `--color-error` | `#ef4444` (239 68 68) | `#ef4444` | 容忍（Linear 无 error token） |
| `--color-danger` | `#ef4444` | `#f87171` (248 113 113) | 容忍 |
| `--color-warning` | `#f59e0b` (245 158 11) | `#facc15` (250 204 21) | amber-500 |
| `--color-accent-{sky,cyan}` | indigo 族 | indigo 族 | info → 收敛为 indigo |
| `--color-accent-{amber,orange}` | amber / `#f97316` | amber / `#f97316` | warn / 暖色点缀 |
| `--color-accent-{pink,rose}` | violet 族 | violet 族 | 收敛为 Accent Violet |

> 注：原 rainbow accent（sky/cyan/amber/orange/pink/rose）已折叠为「indigo 主族 + amber 作 warn + violet 点缀」，贴合 Linear 极简观感。

## 3. 圆角刻度 (Radius)

定义于 `@theme`，同时驱动 `rounded-*` 工具类。

| Token | rem | px | Linear 语义 |
|---|---|---|---|
| `--radius-sm` | 0.125rem | 2px | small |
| `--radius` | 0.3125rem | 5px | base |
| `--radius-md` | 0.375rem | 6px | |
| `--radius-lg` | 0.5rem | 8px | standard |
| `--radius-xl` | 0.75rem | 12px | featured |
| `--radius-2xl` | 1.375rem | 22px | large panel |
| `--radius-3xl` | 9999px | pill | circular |

> ⚠️ 此重映射使组件内 `rounded`=5px、`rounded-md`=6px、`rounded-lg`=8px（原为 8/12/16px），整体视觉收紧，属预期。若观感过紧，可将 `--radius` 调回 `0.5rem` 或对特定组件显式给半径。

## 4. 间距刻度 (Spacing)

基于 Linear 4px 栅格，含 7/11/19px 偏移档。

| Token | rem | px |
|---|---|---|
| `--space-1` | 0.25rem | 4 |
| `--space-2` | 0.5rem | 8 |
| `--space-3` | 0.75rem | 12 |
| `--space-4` | 1rem | 16 |
| `--space-5` | 1.25rem | 20 |
| `--space-6` | 1.5rem | 24 |
| `--space-7` | 0.4375rem | 7 (偏移档) |
| `--space-8` | 0.6875rem | 11 (偏移档) |
| `--space-9` | 1.1875rem | 19 (偏移档) |
| `--space-10` | 2.5rem | 40 |
| `--space-12` | 3rem | 48 |

## 5. 字号刻度 (Typography)

| Token | rem | px | 语义 |
|---|---|---|---|
| `--text-display` | 4.5rem | 72 | Display |
| `--text-display-md` | 4rem | 64 | |
| `--text-display-sm` | 3rem | 48 | |
| `--text-h1` | 2rem | 32 | Heading 1 |
| `--text-h2` | 1.5rem | 24 | Heading 2 |
| `--text-h3` | 1.25rem | 20 | Heading 3 |
| `--text-body-lg` | 1.125rem | 18 | Body Large |
| `--text-body` | 1rem | 16 | Body / Medium / Semibold |
| `--text-body-sm` | 0.9375rem | 15 | Body text (Linear UI 正文) |
| `--text-body-emphasis` | 1.0625rem | 17 | Body Emphasis |
| `--text-code` | 0.875rem | 14 | code (JetBrains Mono) |
| `--text-code-sm` | 0.75rem | 12 | |
| `--text-headline-sm` | 1.5rem | 24 | |
| `--text-label-caps` | 0.6875rem | 11 | label caps |

## 6. 字体 (Fonts)

在 `index.html` 通过 Google Fonts 真实加载（此前 Geist/Space Grotesk/JetBrains Mono 仅写名未加载，运行退回 system-ui，已修复）：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

```css
--font-heading: 'Inter', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', ui-monospace, monospace;
```

- **标题 / 正文**：统一 Inter（Linear 灵魂字族）。
- **代码块**：JetBrains Mono —— Linear 代码字体 Berkeley Mono 为付费字体，不可用，以 JetBrains Mono 作替身（唯一非 100% Linear 之处）。
- 离线时回退 `system-ui`，布局/字号仍稳。

## 7. 已知边界与例外

| 项 | 说明 |
|---|---|
| 代码字体 | Berkeley Mono 付费 → JetBrains Mono 替身 |
| Tailwind 数值工具类 (`p-4`/`gap-2` 等) | 未全局重映射。Linear 间距为绝对 px 栅格，与 Tailwind「倍数×0.25rem」编号体系不兼容；全局重映射会致整站布局漂移。当前「全部 Linear 化」落实于项目自有 token 体系（`--space-*`/`--text-*`/`@theme`/字体/圆角），工具类维持原样。 |
| 滚动条圆角 | 已对齐 `--radius-sm`(2px)。 |
| 玻璃卡片圆角 | 已对齐 `--radius-xl`(12px featured)。 |

## 8. 修改记录

- 2026-09-30：从 M3 骨架 + Tailwind 色板的混合体系，整体重构为 Linear 设计体系（颜色 + 圆角 + 间距 + 字号 + 字体）。详见 `snippet/src/assets/main.css` 与 `index.html`。
- 备份：`snippet/src/assets/main.css.bak`。
