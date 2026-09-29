/**
 * SFC 运行时模块解析系统。
 * 管理 npm 包、内部模块的注册、缓存和动态加载。
 */

import * as vue from 'vue'
import type { Component, App } from 'vue'
import { logger } from './logger'

// 以下模块已被应用静态导入（位于主包），继续保留在 import.meta.glob 动态导入
// 候选里会触发 rolldown 的 INEFFECTIVE_DYNAMIC_IMPORT 警告（chunk 不会拆分）；
// 这里在 glob 中排除它们，并在 registerAliasGlob 之后手动注册等价的别名解析。
import AppHeader from '@/components/layout/AppHeader.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import AppBridge from '@/components/common/AppBridge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import * as loggerModule from '@/utils/logger'
import * as keyboardModule from '@/utils/keyboard'
import * as sfcRuntimeModule from '@/utils/sfcRuntime'
import * as sfcTypescriptModule from '@/utils/sfc-typescript'
import * as enhancedCodeBlockModule from '@/utils/enhancedCodeBlock'
import * as useThemeModule from '@/composables/useTheme'
import * as useToastModule from '@/composables/useToast'
import * as useFavoritesModule from '@/composables/useFavorites'
import * as useIsMobileModule from '@/composables/useIsMobile'
import * as useSnippetListStateModule from '@/composables/useSnippetListState'
import * as useRecentSnippetsModule from '@/composables/useRecentSnippets'

export type ModuleLoader = () => Promise<unknown>

// ─── 组件注册 ──────────────────────────────────────────────────────────

const componentRegistry = new Map<string, Component>()

export function registerSfcComponent(name: string, component: Component): void {
  componentRegistry.set(name, component)
}

export function initSfcComponentRegistry(app: App): void {
  const components = (app as unknown as { _context?: { components?: Record<string, Component> } })
    ._context?.components
  if (!components) return
  for (const [name, comp] of Object.entries(components)) {
    componentRegistry.set(name, comp)
  }
}

export function getComponentRegistry(): Map<string, Component> {
  return componentRegistry
}

// ─── 模块缓存 ─────────────────────────────────────────────────────────

const moduleCache = new Map<string, unknown>()
const moduleLoading = new Map<string, Promise<unknown>>()

// ─── 模块注册表 ────────────────────────────────────────────────────────

const npmModuleRegistry = new Map<string, ModuleLoader>([
  ['vue', async () => vue],
  ['pinia', () => import('pinia')],
  ['vue-router', () => import('vue-router')],
])

const internalModuleRegistry = new Map<string, ModuleLoader>([
  [
    '@/components/common/code/CommonCodeBlock.vue',
    () => import('@/components/common/code/CommonCodeBlock.vue'),
  ],
  [
    '@/components/common/DemoWorkbenchFrame.vue',
    () => import('@/components/common/DemoWorkbenchFrame.vue'),
  ],
])

// ─── 通用别名模块自动发现（覆盖 @/components、@/utils、@/composables） ──
// 示例 SFC 常通过相对路径或别名引用兄弟模块，需按需自动发现才能正常解析。
// 用负向 glob（! 前缀）排除已被应用静态导入的模块：它们位于主包，若继续保留在
// 动态导入候选里会触发 rolldown 的 INEFFECTIVE_DYNAMIC_IMPORT 警告（chunk 不拆分）。
const aliasVueModules = import.meta.glob(
  [
    '@/components/**/*.vue',
    '!@/components/layout/AppHeader.vue',
    '!@/components/common/CommandPalette.vue',
    '!@/components/common/AppBridge.vue',
    '!@/components/common/AppButton.vue',
    '!@/components/common/AppIcon.vue',
  ],
  { eager: false }
)
const aliasComponentTsModules = import.meta.glob('@/components/**/*.{ts,js}', { eager: false })
const aliasUtilsModules = import.meta.glob(
  [
    '@/utils/**/*.{ts,js}',
    '!@/utils/keyboard.ts',
    '!@/utils/logger.ts',
    '!@/utils/sfcRuntime.ts',
    '!@/utils/sfc-typescript.ts',
    '!@/utils/enhancedCodeBlock.ts',
  ],
  { eager: false }
)
const aliasComposablesModules = import.meta.glob(
  [
    '@/composables/**/*.{ts,js}',
    '!@/composables/useTheme.ts',
    '!@/composables/useToast.ts',
    '!@/composables/useFavorites.ts',
    '!@/composables/useIsMobile.ts',
    '!@/composables/useSnippetListState.ts',
    '!@/composables/useRecentSnippets.ts',
  ],
  { eager: false }
)
const aliasModuleMap = new Map<string, ModuleLoader>()
function registerAliasGlob(map: Record<string, unknown>): void {
  for (const [path, loader] of Object.entries(map)) {
    const noExt = path.replace(/^\/src\//, '@/').replace(/\.(ts|vue|js)$/, '')
    const withExt = path.replace(/^\/src\//, '@/')
    aliasModuleMap.set(noExt, loader as ModuleLoader)
    if (!aliasModuleMap.has(withExt)) aliasModuleMap.set(withExt, loader as ModuleLoader)
  }
}
registerAliasGlob(aliasVueModules)
registerAliasGlob(aliasComponentTsModules)
registerAliasGlob(aliasUtilsModules)
registerAliasGlob(aliasComposablesModules)

// 被 glob 排除的静态导入模块：手动注册别名 key（带/不带扩展名各一份），
// 保持示例 SFC 引用这些模块时仍可解析（打包期不产生动态导入分块）。
const staticAliasModules: [string, ModuleLoader][] = [
  ['@/utils/logger', async () => loggerModule],
  ['@/utils/keyboard', async () => keyboardModule],
  ['@/utils/sfcRuntime', async () => sfcRuntimeModule],
  ['@/utils/sfc-typescript', async () => sfcTypescriptModule],
  ['@/utils/enhancedCodeBlock', async () => enhancedCodeBlockModule],
  ['@/composables/useTheme', async () => useThemeModule],
  ['@/composables/useToast', async () => useToastModule],
  ['@/composables/useFavorites', async () => useFavoritesModule],
  ['@/composables/useIsMobile', async () => useIsMobileModule],
  ['@/composables/useSnippetListState', async () => useSnippetListStateModule],
  ['@/composables/useRecentSnippets', async () => useRecentSnippetsModule],
  ['@/components/layout/AppHeader', async () => AppHeader],
  ['@/components/layout/AppHeader.vue', async () => AppHeader],
  ['@/components/common/CommandPalette', async () => CommandPalette],
  ['@/components/common/CommandPalette.vue', async () => CommandPalette],
  ['@/components/common/AppBridge', async () => AppBridge],
  ['@/components/common/AppBridge.vue', async () => AppBridge],
  ['@/components/common/AppButton', async () => AppButton],
  ['@/components/common/AppButton.vue', async () => AppButton],
  ['@/components/common/AppIcon', async () => AppIcon],
  ['@/components/common/AppIcon.vue', async () => AppIcon],
]
for (const [key, loader] of staticAliasModules) {
  aliasModuleMap.set(key, loader)
}

// ─── 资源导入检测 ──────────────────────────────────────────────────────

const ASSET_EXTENSIONS =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|mp4|webm|ogg|mp3|wav|woff2?|ttf|eot|json)$/i

function isAssetImport(source: string): boolean {
  return ASSET_EXTENSIONS.test(source)
}

function resolveAssetUrl(source: string): string {
  const baseUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/'
  const relativePath = source.replace(/^@\//, '')
  return `${baseUrl}${relativePath}`
}

// ─── 相对路径解析 ──────────────────────────────────────────────────────

// 基于真实 componentPath 的相对解析（不假设 demos/ 前缀），返回 /src/... 绝对路径（含扩展）。
// 用于 svg-lessons 等课程：其相对 import 指向自身所在目录的兄弟文件，
// 例如 /src/views/svg-lessons/Xxx.vue 里的 `./SquareCoordinateArt.vue`
// → /src/views/svg-lessons/SquareCoordinateArt.vue。
function resolveRelativeToAlias(source: string, componentPath?: string): string | null {
  if (!componentPath || (!source.startsWith('./') && !source.startsWith('../'))) return null
  const base = componentPath.replace(/^@\//, '/src/').replace(/\/[^/]*$/, '')
  const parts = base.split('/').filter(Boolean)
  for (const seg of source.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return '/' + parts.join('/')
}

// 课程源文件与共享组件同处 src/views/svg-lessons/by-doc/<章>/ 下，
// 课程里相对 import（如 ./Chapter16DemoFrame）指向的兄弟组件
// 也位于 by-doc/<章>/。这里按导入文件的章节号（Ch\d+）回退查找。
function resolveByDoc(source: string, componentPath?: string): ModuleLoader | undefined {
  if (!componentPath || (!source.startsWith('./') && !source.startsWith('../'))) return undefined
  const chMatch = componentPath.match(/Ch(\d+)/i)
  if (!chMatch) return undefined
  const chapter = chMatch[1]
  const name = source
    .replace(/^\.\.\//, '')
    .replace(/^\.\//, '')
    .replace(/\.(vue|ts|js)$/, '')
  const base = `@/views/svg-lessons/by-doc/${chapter}/${name}`
  const loader =
    aliasModuleMap.get(base) ||
    aliasModuleMap.get(`${base}.vue`) ||
    aliasModuleMap.get(`${base}.ts`) ||
    aliasModuleMap.get(`${base}.js`)
  if (loader) return loader
  // 大小写不敏感兜底（导入名可能与文件名大小写不一致）
  const lower = name.toLowerCase()
  for (const [key, l] of aliasModuleMap) {
    if (
      key.startsWith(`@/views/svg-lessons/by-doc/${chapter}/`) &&
      key.toLowerCase().endsWith(`/${lower}`)
    ) {
      return l
    }
  }
  return undefined
}

// ─── 模块加载 ──────────────────────────────────────────────────────────

export async function ensureModule(source: string, componentPath?: string): Promise<unknown> {
  if (moduleCache.has(source)) {
    return moduleCache.get(source)
  }

  if (isAssetImport(source)) {
    const url = resolveAssetUrl(source)
    moduleCache.set(source, url)
    return url
  }

  if (moduleLoading.has(source)) {
    return moduleLoading.get(source)
  }

  let resolver = npmModuleRegistry.get(source) || internalModuleRegistry.get(source)

  if (!resolver && componentPath) {
    // 通用别名相对解析（覆盖 svg-lessons 等基于真实 componentPath 的相对 import）
    if (!resolver) {
      const relAlias = resolveRelativeToAlias(source, componentPath)
      if (relAlias) {
        const key = relAlias.replace(/^\/src\//, '@/').replace(/\.(ts|vue|js)$/, '')
        resolver =
          aliasModuleMap.get(key) ||
          aliasModuleMap.get(`${key}.vue`) ||
          aliasModuleMap.get(`${key}.ts`) ||
          aliasModuleMap.get(`${key}.js`)
      }
    }
    // 兄弟目录回退：课程共享组件实际位于 by-doc/<章>/
    if (!resolver) {
      resolver = resolveByDoc(source, componentPath)
    }
  }

  // 最后兜底：任何 @/ 或 /src/ 开头的别名，尝试通用别名表解析
  if (!resolver && (source.startsWith('@/') || source.startsWith('/src/'))) {
    const key = source.replace(/^\/src\//, '@/').replace(/\.(ts|vue|js)$/, '')
    resolver =
      aliasModuleMap.get(key) ||
      aliasModuleMap.get(`${key}.vue`) ||
      aliasModuleMap.get(`${key}.ts`) ||
      aliasModuleMap.get(`${key}.js`)
  }

  if (!resolver) {
    // 共享组件缺失（源文件迁移时未带入仓库）：返回可见的占位组件而非空对象，
    // 既避免静默空白 + 控制台告警刷屏，也诚实标记缺失来源，便于后续补齐。
    logger.warn('sfcRuntime', `缺失模块，使用占位组件: ${source}`)
    const stub = {
      name: 'MissingModuleStub',
      render: () =>
        vue.h(
          'div',
          {
            class: 'sfc-missing-module',
            style:
              'padding:12px 14px;border:1px dashed rgba(255,180,80,.6);border-radius:8px;color:#ffb450;font-size:12px;background:rgba(255,180,80,.06);margin:8px 0;',
          },
          `⚠ 组件缺失：${source}`
        ),
    }
    moduleCache.set(source, stub)
    return stub
  }

  const promise = resolver()
    .then((mod) => {
      moduleCache.set(source, mod)
      moduleLoading.delete(source)
      return mod
    })
    .catch((err) => {
      // 失败时不写入 moduleCache，允许下次请求重试
      // （网络抖动、CDN 临时不可用等场景下，重试可能成功）
      moduleLoading.delete(source)
      logger.error('sfcRuntime', `模块加载失败: ${source}`, err)
      const empty = {}
      return empty
    })

  moduleLoading.set(source, promise)
  return promise
}

// ─── 导入语句解析与重写 ────────────────────────────────────────────────

export function extractImportSources(scriptContent: string): string[] {
  const sources: string[] = []
  const importRe = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  const sideEffectRe = /import\s+['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = importRe.exec(scriptContent)) !== null) {
    sources.push(match[1])
  }
  while ((match = sideEffectRe.exec(scriptContent)) !== null) {
    if (!sources.includes(match[1])) {
      sources.push(match[1])
    }
  }
  return sources
}

export function extractDynamicImportSources(scriptContent: string): string[] {
  const sources: string[] = []
  const dynamicImportRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let match: RegExpExecArray | null
  while ((match = dynamicImportRe.exec(scriptContent)) !== null) {
    sources.push(match[1])
  }
  return sources
}

export function rewriteScriptImports(scriptContent: string): string {
  let result = scriptContent

  const importStatementRe = /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm
  const sideEffectImportRe = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm

  result = result.replace(importStatementRe, (_match, importClause, source) => {
    const depsAccess = `__deps__["${source}"]`

    const namespaceMatch = importClause.match(/^\*\s+as\s+(\w+)$/)
    if (namespaceMatch) {
      return `const ${namespaceMatch[1]} = ${depsAccess}\n`
    }

    const defaultMatch = importClause.match(/^(\w+)(?:\s*,\s*(\{[\s\S]*\}))?$/)
    if (defaultMatch) {
      const lines: string[] = []
      const defaultName = defaultMatch[1]
      if (defaultName !== 'type' && defaultName !== 'typeof') {
        lines.push(`const ${defaultName} = ${depsAccess}.default ?? ${depsAccess}`)
      }
      if (defaultMatch[2]) {
        const destructuredClause = defaultMatch[2].replace(/\s+as\s+/g, ': ')
        lines.push(`const ${destructuredClause} = ${depsAccess}`)
      }
      return lines.join('\n') + '\n'
    }

    const namedMatch = importClause.match(/^\{([\s\S]*)\}$/)
    if (namedMatch) {
      const destructuredClause = namedMatch[1].replace(/\s+as\s+/g, ': ')
      return `const { ${destructuredClause} } = ${depsAccess}\n`
    }

    return `// [sfcRuntime] 无法解析: import ${importClause} from '${source}'\n`
  })

  result = result.replace(sideEffectImportRe, (_match, source) => {
    return `void __deps__["${source}"]\n`
  })

  return result
}

export function rewriteDynamicImports(scriptContent: string): string {
  return scriptContent.replace(
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
    (_match, _quote, source) => `__dynamicImport__("${source}")`
  )
}
