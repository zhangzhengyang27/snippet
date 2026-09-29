// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * SFC 运行时编译核心。
 * 负责将 SFC 字符串在浏览器端编译为 Vue Component，支持：
 * - TypeScript → JavaScript 降级
 * - 模块导入重写与动态加载
 * - 安全验证与沙箱执行
 * - 样式注入与 scoped style 支持
 */

import type { Component } from 'vue'
import { defineComponent } from 'vue'
import * as vue from 'vue'
import { logger } from './logger'
import { preprocessSfcTsToJs, extractInlineTemplateStyles } from './sfc-typescript'
import {
  ensureModule,
  extractImportSources,
  extractDynamicImportSources,
  rewriteScriptImports,
  rewriteDynamicImports,
  getComponentRegistry,
} from './sfc-modules'

export type { ModuleLoader } from './sfc-modules'
export { registerSfcComponent, initSfcComponentRegistry } from './sfc-modules'

// ─── 类型定义 ──────────────────────────────────────────────────────────

export interface SfcCodeInput {
  raw?: string
  template?: string
  script?: string
  style?: string
}

export interface SfcCompileResult {
  component: Component | null
  styles: string[]
  error: Error | null
}

export interface SfcCompileContext {
  moduleRoot?: string
  demoId?: string
  componentPath?: string
}

export interface SfcCompileOptions {
  demoId?: string
  componentPath?: string
  skipCache?: boolean
}

export interface SfcComponentResult {
  component: Component
  styles: string[]
}

type CompilerSfc = typeof import('@vue/compiler-sfc')

// ─── 编译器加载 ────────────────────────────────────────────────────────

let compilerSfc: CompilerSfc | null = null

export function setSfcCompiler(compiler: CompilerSfc): void {
  compilerSfc = compiler
}

export async function loadSfcCompiler(): Promise<CompilerSfc> {
  if (compilerSfc) return compilerSfc
  compilerSfc = await import('@vue/compiler-sfc')
  return compilerSfc
}

// ─── 安全验证 ──────────────────────────────────────────────────────────

const isSfcRuntimeDebug = Boolean(import.meta.env?.DEV && import.meta.env?.VITE_SFC_RUNTIME_DEBUG)
const RUNTIME_BODY_MAX_LENGTH = 500000
const DANGEROUS_RUNTIME_PATTERNS = [
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /\bFunction\s*\(\s*['"`]/i,
  /\bWebSocket\s*\(/i,
  /\bdocument\.write\s*\(/i,
  /\blocation\s*\.\s*(?:href|assign|replace)\s*=/i,
  /\bwindow\s*\.\s*location\s*=/i,
  /\btop\s*\.\s*(?:location|href)/i,
  /\bparent\s*\.\s*(?:location|href)/i,
]

function hasDangerousRuntimePatterns(source: string): boolean {
  return DANGEROUS_RUNTIME_PATTERNS.some((pattern) => pattern.test(source))
}

function validateRuntimeBody(
  runtimeBody: string,
  { source = 'runtime', warnOnly = false }: { source?: string; warnOnly?: boolean } = {}
): boolean {
  if (runtimeBody.length > RUNTIME_BODY_MAX_LENGTH) {
    const message = 'SFC 编译产物过大，可能存在异常输入'
    if (warnOnly) {
      logger.warn('sfcRuntime', `${source} ${message}`)
      return false
    }
    throw new Error(message)
  }

  if (hasDangerousRuntimePatterns(runtimeBody)) {
    const message = 'SFC 编译产物包含不安全的运行时调用'
    if (warnOnly) {
      logger.warn('sfcRuntime', `${source} ${message}`)
      return false
    }
    throw new Error(message)
  }

  return true
}

function detectUndeclaredAssignments(body: string): string[] {
  const declarations: string[] = []
  const commonVars = ['option']
  for (const varName of commonVars) {
    const hasDeclaration = new RegExp(`\\b(?:var|let|const)\\s+${varName}\\b`).test(body)
    if (!hasDeclaration) {
      const hasAssignment = new RegExp(`(?<![.\\w])${varName}\\s*=[^=]`).test(body)
      if (hasAssignment) {
        declarations.push(varName)
      }
    }
  }
  return declarations
}

function executeRuntimeBody(
  runtimeBody: string,
  deps: Record<string, unknown>,
  sfcHolder: { __sfc__: Component | null }
) {
  const sanitizedBody = runtimeBody
    .replace(/\beval\b/g, '__unsafe_eval__')
    .replace(/\barguments\b/g, '__unsafe_arguments__')

  const undeclaredVars = detectUndeclaredAssignments(sanitizedBody)
  const varDeclarations = undeclaredVars.map((v) => `var ${v};`).join('')

  const fn = new Function(
    '__deps__',
    '__sfc_holder__',
    '"use strict";\n' +
      'var parent=undefined, top=undefined, opener=undefined;\n' +
      'var __unsafe_eval__=undefined, __unsafe_arguments__=undefined;\n' +
      'var ROOT_PATH="/echarts-data";\n' +
      varDeclarations +
      sanitizedBody
  )
  fn(deps, sfcHolder)
}

// ─── 缓存 ─────────────────────────────────────────────────────────────

const compilerCache = new Map<string, SfcComponentResult>()

// ─── 辅助函数 ──────────────────────────────────────────────────────────

/** 简易字符串哈希（FNV-1a），用于派生编译缓存 key，避免长源码文本直接作 key */
function hashContent(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function formatCompilerErrors(errors: unknown[]): string {
  return errors
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'message' in item) {
        return (item as { message?: string }).message || JSON.stringify(item)
      }
      return String(item)
    })
    .join('\n')
}

function extractScriptAttrs(raw?: string): string {
  if (!raw) return ''
  const match = raw.match(/<script\s+([^>]*)>/)
  return match ? ' ' + match[1] : ''
}

function wrapSfc(code: SfcCodeInput): string {
  let sfc = ''
  if (code.template) sfc += `<template>\n${code.template}\n</template>\n`

  const scriptAttrs = extractScriptAttrs(code.raw)
  if (code.script) sfc += `<script${scriptAttrs}>\n${code.script}\n</script>\n`

  if (code.style) sfc += `<style>\n${code.style}\n</style>\n`
  return sfc
}

// ─── 样式注入 ──────────────────────────────────────────────────────────

const injectedStyleIds = new Set<string>()

export function injectSfcStyles(styles: string[], scopeId?: string): string[] {
  const ids: string[] = []
  const baseId = scopeId || `sfc-${Date.now()}`
  styles.forEach((style, index) => {
    const id = `style-${baseId}-${index}`
    if (injectedStyleIds.has(id)) return
    const styleEl = document.createElement('style')
    styleEl.id = id
    styleEl.textContent = style
    document.head.appendChild(styleEl)
    injectedStyleIds.add(id)
    ids.push(id)
  })
  return ids
}

export function removeSfcStyles(): void {
  for (const id of injectedStyleIds) {
    const el = document.getElementById(id)
    if (el) el.remove()
  }
  injectedStyleIds.clear()
}

// ─── SFC 编译 ──────────────────────────────────────────────────────────

/** 收集脚本与模板中的模块依赖并加载，返回可注入运行时的 deps 与去重后的来源列表。 */
async function collectModuleDeps(
  scriptCode: string,
  templateCode: string,
  componentPath?: string
): Promise<{ deps: Record<string, unknown>; uniqueSources: string[] }> {
  const importSources: string[] = [
    ...extractImportSources(scriptCode),
    ...extractImportSources(templateCode),
    ...extractDynamicImportSources(scriptCode),
    ...extractDynamicImportSources(templateCode),
  ]
  const uniqueSources = [...new Set(importSources)]
  const deps: Record<string, unknown> = { vue }
  await Promise.all(
    uniqueSources.map(async (src) => {
      if (src !== 'vue') {
        deps[src] = await ensureModule(src, componentPath)
      }
    })
  )
  return { deps, uniqueSources }
}

/** 对编译后的脚本/模板代码执行 import.meta.env 等环境变量替换。 */
function applyEnvReplacementsToCode(
  scriptCode: string,
  templateCode: string
): {
  envScript: string
  envTemplate: string
} {
  const baseUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/'
  const envReplacements: [RegExp, string][] = [
    [/\bimport\.meta\.env\.BASE_URL\b/g, JSON.stringify(baseUrl)],
    [/\bimport\.meta\.env\.MODE\b/g, JSON.stringify(import.meta.env.MODE || 'development')],
    [/\bimport\.meta\.env\.DEV\b/g, String(!!import.meta.env.DEV)],
    [/\bimport\.meta\.env\.PROD\b/g, String(!!import.meta.env.PROD)],
  ]
  const apply = (inputCode: string): string => {
    let result = inputCode
    for (const [pattern, replacement] of envReplacements) {
      result = result.replace(pattern, replacement)
    }
    result = result.replace(new RegExp(`\\$\\{${JSON.stringify(baseUrl)}\\}`, 'g'), baseUrl)
    result = result.replace(new RegExp(`\\$\\{'${baseUrl}'\\}`, 'g'), baseUrl)
    return result
  }
  return { envScript: apply(scriptCode), envTemplate: apply(templateCode) }
}

/** 将执行得到的 __sfc__ 包装为正式 Vue 组件。 */
function buildSfcComponent(
  sfc: Component,
  demoId: string | undefined,
  scopeId: string,
  hasScopedStyle: boolean
): Component {
  const sfcRecord = sfc as Record<string, unknown>
  const origSetup =
    typeof sfcRecord.setup === 'function'
      ? (sfcRecord.setup as (props: unknown, ctx: unknown) => unknown).bind(sfc)
      : null
  const origRender =
    typeof sfcRecord.render === 'function'
      ? (sfcRecord.render as (...args: unknown[]) => unknown).bind(sfc)
      : null

  const componentRegistry = getComponentRegistry()
  return defineComponent({
    ...sfc,
    name:
      (sfcRecord.name as string | undefined) ||
      (sfcRecord.__name as string | undefined) ||
      `DemoComponent_${demoId}`,
    inheritAttrs: (sfcRecord.inheritAttrs as boolean | undefined) ?? false,
    components: {
      ...(sfcRecord.components as Record<string, Component> | undefined),
      ...Object.fromEntries(componentRegistry),
    },
    ...(hasScopedStyle ? { __scopeId: `data-v-${scopeId}` } : {}),
    ...(origSetup
      ? {
          setup(props, ctx) {
            return origSetup(props, ctx)
          },
        }
      : {}),
    ...(origRender
      ? {
          render(_ctx, _cache, $props, $setup, $data, $options) {
            try {
              return origRender(_ctx, _cache, $props, $setup, $data, $options)
            } catch (err) {
              logger.error(
                'sfcRuntime',
                `${demoId} render 执行失败:`,
                err instanceof Error ? err.message : String(err)
              )
              throw err
            }
          },
        }
      : {}),
  })
}

export async function compileSfcToComponent(
  code: SfcCodeInput,
  options: SfcCompileOptions = {}
): Promise<SfcComponentResult> {
  const { demoId, componentPath, skipCache } = options
  // demoId 相同但内容已更新（如编辑器内修改后重新编译）时，仅用 demoId 会命中
  // 旧缓存；追加内容哈希后，源码变化必然产生新的缓存 key，缓存始终对应最新内容
  const cacheKey = demoId ? `${demoId}:${hashContent(code.raw)}` : code.raw

  if (!skipCache && compilerCache.has(cacheKey)) {
    return compilerCache.get(cacheKey) as SfcComponentResult
  }

  const compiler = await loadSfcCompiler()
  const { parse, compileScript, compileTemplate, compileStyle, rewriteDefault } = compiler

  let sfcSource = code.raw || ''
  if (!sfcSource && (code.template || code.script || code.style)) {
    sfcSource = wrapSfc(code)
  }

  const isTsScript = sfcSource.includes('lang="ts"') || sfcSource.includes("lang='ts'")
  if (isTsScript) {
    sfcSource = sfcSource.replace(/lang\s*=\s*["']ts["']/g, 'lang="js"')
    sfcSource = preprocessSfcTsToJs(sfcSource)
  }

  sfcSource = extractInlineTemplateStyles(sfcSource)
  if (componentPath) {
    sfcSource = sfcSource.replace(
      /(['"])(?:\.\.\/|\.)\/lmm\//g,
      `$1${componentPath.replace(/\/[^/]*$/, '')}/lmm/`
    )
  }

  const { descriptor, errors } = parse(sfcSource, {
    filename: `${demoId || 'App'}.vue`,
  })

  if (errors.length) {
    throw new Error(`SFC 解析错误: ${formatCompilerErrors(errors)}`)
  }

  if (!descriptor.template || !descriptor.template.content.trim()) {
    throw new Error('缺少 <template> 内容')
  }

  const scopeId = `sfc-${demoId || Date.now()}`
  const hasScopedStyle = descriptor.styles.some((s) => s.scoped)

  let bindingMetadata: Record<string, string> = {}
  let scriptCode = 'const __sfc__ = {}'

  if (descriptor.script || descriptor.scriptSetup) {
    try {
      const scriptResult = compileScript(descriptor, { id: scopeId })
      bindingMetadata = (scriptResult.bindings as Record<string, string>) || {}
      scriptCode = rewriteDefault(scriptResult.content, '__sfc__')
    } catch (err) {
      throw new Error(`Script 编译错误: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      })
    }
  }

  let templateCode = ''
  if (descriptor.template?.content) {
    try {
      const templateResult = compileTemplate({
        source: descriptor.template.content,
        filename: `${demoId || 'App'}.vue`,
        id: scopeId,
        scoped: hasScopedStyle,
        compilerOptions: { bindingMetadata },
      })
      if (templateResult.errors && templateResult.errors.length > 0) {
        throw new Error(`Template 编译错误: ${formatCompilerErrors(templateResult.errors)}`)
      }
      templateCode = templateResult.code
        .replace(/export\s+function\s+render\b/g, 'function __sfc_render__')
        .replace(/function\s+render\b/g, 'function __sfc_render__')
    } catch (err) {
      throw new Error(`Template 编译错误: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      })
    }
  }

  const styles: string[] = []
  for (const style of descriptor.styles) {
    try {
      const styleResult = compileStyle({
        source: style.content,
        filename: `${demoId || 'App'}.vue`,
        id: scopeId,
        scoped: style.scoped,
      })
      if (styleResult.errors && styleResult.errors.length > 0) {
        throw new Error(`Style 编译错误: ${formatCompilerErrors(styleResult.errors)}`)
      }
      if (styleResult.code) {
        styles.push(styleResult.code)
      }
    } catch (err) {
      throw new Error(`Style 编译错误: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      })
    }
  }

  // ─── 模块依赖收集 ────────────────────────────────────────────────────
  const { deps, uniqueSources } = await collectModuleDeps(scriptCode, templateCode, componentPath)

  const rewrittenScript = rewriteDynamicImports(rewriteScriptImports(scriptCode))
  const rewrittenTemplate = rewriteDynamicImports(rewriteScriptImports(templateCode))

  // ─── 环境变量替换 ────────────────────────────────────────────────────
  const { envScript, envTemplate } = applyEnvReplacementsToCode(rewrittenScript, rewrittenTemplate)

  if (isSfcRuntimeDebug && uniqueSources.length > 0) {
    const fullCode = envScript + '\n' + envTemplate
    const remaining = fullCode.match(/^import\s+/m)
    if (remaining) {
      logger.warn('sfcRuntime', `${demoId} rewriteScriptImports 后仍有 import 残留`)
    }
  }

  // ─── 运行时组装 ──────────────────────────────────────────────────────
  const runtimeBody = [
    `const __dynamicImport__ = (source) => {
  if (!Object.prototype.hasOwnProperty.call(__deps__, source)) {
    return Promise.reject(new Error(\`[sfcRuntime] 不允许的动态导入: \${source}\`))
  }
  const mod = __deps__[source]
  if (mod && (typeof mod === 'object' || typeof mod === 'function')) {
    return Promise.resolve(mod)
  }
  return Promise.resolve({ default: mod })
}`,
    '',
    envScript,
    '',
    envTemplate,
    '',
    '__sfc__.render = __sfc_render__',
    hasScopedStyle ? `__sfc__.__scopeId = "data-v-${scopeId}"` : '',
    '__sfc_holder__.__sfc__ = __sfc__',
  ]
    .filter(Boolean)
    .join('\n')

  const sfcHolder: { __sfc__: Component | null } = { __sfc__: null }
  validateRuntimeBody(runtimeBody)

  try {
    executeRuntimeBody(runtimeBody, deps, sfcHolder)
  } catch (err) {
    if (isSfcRuntimeDebug) {
      logger.error(
        'sfcRuntime',
        `${demoId} new Function 执行失败:`,
        err instanceof Error ? err.message : String(err)
      )
      logger.error('sfcRuntime', `${demoId} runtimeBody (前500字符):`, runtimeBody.slice(0, 500))
    }
    throw new Error(`SFC 运行时代码执行错误: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    })
  }

  const sfc = sfcHolder.__sfc__
  if (!sfc) {
    throw new Error('编译后 __sfc__ 未生成')
  }

  if (isSfcRuntimeDebug) {
    logger.warn('sfcRuntime', `${demoId} 编译成功:`, {
      hasSetup: typeof sfc.setup === 'function',
      hasRender: typeof sfc.render === 'function',
      keys: Object.keys(sfc),
    })
  }

  const component = buildSfcComponent(sfc, demoId, scopeId, hasScopedStyle)

  const result: SfcComponentResult = { component, styles }
  compilerCache.set(cacheKey, result)

  return result
}

export async function compileSfc(
  code: SfcCodeInput,
  options: SfcCompileOptions = {}
): Promise<SfcCompileResult> {
  try {
    const { component, styles } = await compileSfcToComponent(code, options)
    return { component, styles, error: null }
  } catch (err) {
    logger.error('sfcRuntime', 'SFC 编译失败:', err instanceof Error ? err.message : String(err))
    return {
      component: null,
      styles: [],
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
}
