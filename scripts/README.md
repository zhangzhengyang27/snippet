# scripts/

本目录只保留**当前仍在使用的脚本**；历史一次性脚本统一沉到 [`archive/`](./archive)。

## 活脚本（勿动）

| 脚本 | 调用方 | 用途 |
|------|--------|------|
| `build-iconify-offline.mjs` | `npm run icons:build` / `npm run icons:check` | 扫描源码里的 Iconify 图标名 → 从 `@iconify-json/*` 生成 `src/generated/iconify-offline.ts` |

> ⚠️ 往源码里新增图标后必须跑 `npm run icons:build`，否则 `npm run icons:check`
> 与 `src/utils/iconify-offline.spec.ts` 会失败。

## archive/（历史归档，不参与构建与 lint）

`archive/` 下是项目演进期的一次性脚本，**保留仅供追溯，不再维护**。大体可分四类：

| 类别 | 例子 |
|------|------|
| 站点抓取 / 数据迁移 | `scrape-wegic-templates.ts`、`download-wegic-*.ts`、`convert-static-site-tailwind.mjs` |
| 批量翻译 | `translate-*.py`、`extract_i18n_strings.py` |
| 审计 / 诊断 | `diag-*.cjs`、`verify-*.cjs`、`audit-*.cjs` |
| 早期调试 | `test-*.ts`、`dbg-*.cjs`、`restart_backend.cjs`、`_migration-conventions.md` |

`archive/data-exports/` 是三份 JSON 导出快照（`code-snippets.json` 等），
原供一次性 seed 脚本回灌使用。

### 注意事项

- 这些脚本里的路径多是**搬迁前**的绝对路径（如 `/Users/xiaoye/Desktop/html5-examples/...`），
  直接运行会失败——归档而非删除，是为了保留当时的处理逻辑作为参考。
- 其中一批「静态站点抓取 / 翻译」脚本所依赖的 `public/static-sites/` 数据目录
  已于 2026-10-14 清理（源码无引用、数据库片段 0 条引用），这些脚本已彻底不可运行。
- 归档恢复留档（根目录 `_RESTORE-MANIFEST.json` / `_RESTORE-REPORT.md`）与
  `.damaged` 截断文件同批清理，可按需从 git 历史取回。
