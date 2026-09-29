# snippet 项目恢复报告（2026-09-29）

> 背景：`~/Desktop/20260810/` 下原 `snippet`（知识片段与可运行示例平台，Vue3 前端）与
> `html5-examples`（示例+游戏+配套 NestJS 后端）目录在 2026-09 删除事故中丢失。
> 经核实 **snippet 从未发布到 NAS**（《NAS全量回迁报告-20260924》记录其为「本地独有项目」），
> 本次恢复完全来自本机各开发工具的本地缓存。

## 1. 恢复结果

| 项目 | 位置 | 文件数 | 状态 |
|---|---|---|---|
| snippet（前端） | `nas-projects/snippet/` | 239 | typecheck 0 错 / vitest 36 通过 / vite build 成功 / eslint 0 错 |
| html5-examples server（后端 NestJS） | `nas-projects/snippet-server/` | 31 | controller/service/dto 已恢复（原路径为 `html5-examples/server`，按 README 口径独立存放） |

验证命令（在 `nas-projects/snippet/` 内）：

```bash
npx vue-tsc --noEmit   # 0 错误
npx vitest run         # 36/36 通过
npx vite build         # ✓ built in ~1.1s（dist 22M，含 rolldown 分包）
npx eslint .           # 0 错误（scripts/ 历史脚本已排除）
```

> 依赖安装用 `npm install --no-save --legacy-peer-deps`（原 `pnpm-lock.yaml` 不可恢复，
> 可用 `pnpm install` 重新生成；注意 package.json 声明了 `patches/xiaoye-ui.patch`，
> 该 patch 文件内容缺失，pnpm 安装会报错，需先注释 patchedDependencies 或补空 patch，
> 本次验证已改用 vite alias 打桩绕过，见 §4）。

## 2. 恢复来源（按可信度）

每个文件的来源记录在 `snippet/_RESTORE-MANIFEST.json`：

| 来源 | 文件数 | 说明 |
|---|---|---|
| surviving（现存残缺目录） | 68 | 20260810/snippet 里 9-22 恢复残留的文件 = 会话后最终态，优先级最高 |
| snapshot（workbuddy file-history 快照） | 64 | 快照哈希规则已破解：`sha256(文件绝对路径)[:16] + '@vN'`，取每文件最高版本 |
| wb-replay（workbuddy 会话重放） | 57 | 重放 html5-examples 项目 33 个会话记录里的 Write/Edit/Read（含 1106 文件） |
| zc-replay / zc-bash-extract | 11 | ZCode db.sqlite 的 8 个相关会话（730 条工具调用）按时间线重放 + Bash cat 输出定向提取 |
| wb-root / he-bash-extract | 13 | html5-examples 时代的根配置（tsconfig/eslint/env.d.ts 等） |
| snapshot/zc-replay（后端） | 32 | snippet-server 全部文件 |
| hand-written（标注重建） | 1 | vitest.config.ts（无任何缓存证据，按项目标准写法重建） |

另有约 20 个文件在子代理重建阶段按「调用点反推」重写，文件头带「恢复推断/恢复重建」注释：
types/index.ts 与 3 个类型文件、api/examples.ts、6 个 utils、10 个 UI 组件、
DashboardPage / RecentPage / FavoritesPage / SnippetDetailPane / CommandPalette、
snippet-export-import.ts 后半 + 2 个 spec 文件。

## 3. 各缓存源明细（中间产物保留在 `nas-projects/.snippet-restore/`，37M）

- `snapshots/` — workbuddy file-history 745 个快照按原路径还原（含 html5-examples 时代 src/server/public/scripts）
- `wb-reconstructed/` — workbuddy 会话重放产物（1106 文件，含根配置、docs/、patches/）
- `reconstructed/` — ZCode 会话重放产物（73 前端文件 + 4 服务端文件 + 根配置提取）
- `evidence/` — ZCode 730 条工具调用流水（tool_calls.jsonl）与文件清单
- `checkpoint_inventory.json` — **ZCode checkpoint manifest**：2026-08-30 15:02 snippet 工作区
  全量 747 文件清单（含 .git 558 个文件），是文件级「应该有什么」的权威对照
- `all-projects/` — 扫描全部 43 个 workbuddy 项目后还原的 1524 个跨项目快照

## 4. 构建期补丁（均有注释留痕）

1. `@iconify/vue` 补入 package.json dependencies（wb 时代 AppIcon 基于 iconify，'ms:*' 图标名）
2. `vite.config.ts` 增加 alias：`@tiptap/extension-collaboration`、`@tiptap/y-tiptap`、
   `@tiptap/extension-node-range` → `patches/stub-empty.js` / `stub-tiptap-node-range.js`。
   这些是 xiaoye-ui 的 markdown-editor 传递依赖，本项目不使用 markdown 编辑器
   （vite.config 原注释已说明），原环境由 pnpm patch 处理，patch 原文丢失故改用打桩
3. `src/assets/main.css` 用 html5-examples 时代版本（627 行 Tailwind v4 @theme），
   其中 `@apply bg-background text-foreground` 使用的 token 在 snippet 主题不存在，改为原生 CSS

## 5. 明确无法恢复的缺口

| 缺失 | 说明 |
|---|---|
| ZCode checkpoint 加密包 | 8-30 全量快照 tar（含完整 .git 历史 558 文件）为 AES-256-CTR + RSA-OAEP 加密，私钥不在本机（keyId=1 指向服务端密钥）。manifest 明文可读，已用作恢复对照 |
| `.git` 历史 | 随目录删除，仅存在于上述加密包内 |
| `pnpm-lock.yaml` | 无缓存证据，`pnpm install` 可重新生成 |
| `patches/xiaoye-ui.patch`（864B） | pnpm patch 原文；现有 `patches/_reference_@xiaoye-ui__core@5.1.0.patch` 仅供参考；构建已用 alias 打桩替代 |
| `docs/DESIGN_SYSTEM.md`、`docs/XIAOYE-UI-DARK-ADAPTATION.md`（合计 34KB 文档） | 无任何缓存副本 |
| `scripts/` 一次性数据库脚本约 60 个 + `scripts/backup_split_aclass_*/` 数据备份 | 均为一次性运维工具/数据快照，无缓存副本；`annotate_difficulty.cjs` 已从 Bash 输出中找回；4 个截断损坏的脚本改名 `*.damaged` 留档 |
| `.github/workflows/ci.yml`、`.prettierignore` | 已按标准重建（标注恢复推断） |
| `.codebuddy/plans/移动端全面适配_734366b1.md` | 无副本 |

## 6. 已知的恢复近似（使用前须知）

- `types/`、`api/examples.ts`、utils、UI 组件、几个页面为**按调用点反推的重建**，
  导出签名与所有幸存调用点一致，但内部实现/视觉细节可能与原版有差异
- `AppHeader.vue` 为 html5-examples 时代版本，其中主题导航（store.topics）在 snippet
  中恒为空；路由引用已修正为 snippet 的路由名
- `KnowledgeSnippetsPage` 需要的批量接口在前端与后端两侧按调用点契约补齐
  （`batchAddKnowledgeSnippetTag` / `batchDeleteKnowledgeSnippets`）
- 服务端仅恢复了 knowledge/snippets 与 examples 模块等被捕获的部分；
  entities 目录多数文件缺失（`snippet-server` 现状按快照原样，未补写）

---
*生成：2026-09-29，ZCode 恢复作业记录。中间产物与全部提取脚本见 `nas-projects/.snippet-restore/`。*
