// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * TypeScript 注解剥离工具。
 * 在 SFC 运行时编译前将 <script lang="ts"> 转为 <script lang="js">，
 * 去除类型注解以保证浏览器端 new Function() 可执行。
 */

/**
 * 剥离 TypeScript 类型注解，将 TS 代码降级为 JS。
 * 保护 import 语句不被误改。
 */
export function stripTypeAnnotations(code: string): string {
  let result = code

  // 保护 import 语句，防止被后续正则误改
  const protectedImports: string[] = []
  result = result.replace(
    /^\s*import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (match) => {
      protectedImports.push(match)
      return `__IMPORT_PLACEHOLDER_${protectedImports.length - 1}__`
    }
  )

  result = result.replace(/\b(ref|reactive|computed|shallowRef|readonly)<[^>]+>\(/g, '$1(')
  result = result.replace(/\b(defineProps|defineEmits|defineExpose|defineOptions)<[^>]+>\(/g, '$1(')

  // 仅剥离类型注解，保留变量声明。注意：[^\n] 不能跨行，否则贪婪匹配会吞掉
  // 同一作用域内多个「let x: Type」声明直到首个「=」，导致后续变量声明被删除
  // （如 three.js demo 的 let camera/renderer/... 声明整块消失 → "camera is not defined"）。
  result = result.replace(/\b(let|const|var)\s+(\w+)\s*:\s*[^=;\n]+/g, (match) => {
    const nameMatch = match.match(/\b(let|const|var)\s+(\w+)/)
    if (!nameMatch) return match
    const [, keyword, name] = nameMatch
    return `${keyword} ${name}`
  })

  const paramTypeRe =
    /(\{[^}]+\}|\w+)\s*:\s*[A-Za-z_$][\w$]*(?:<[^>]+>)?(?:\[\])?(?:\s*[|&]\s*[A-Za-z_$][\w$]*(?:<[^>]+>)?(?:\[\])?)*/g

  result = result.replace(
    /(\bfunction\s+\w+\s*\()([^)]*)(\))/g,
    (match, prefix, params, suffix) => {
      const cleaned = params.replace(paramTypeRe, '$1')
      return prefix + cleaned + suffix
    }
  )

  result = result.replace(
    /\(([^)]*)\)(?:\s*:\s*[A-Za-z_$][\w$]*(?:<[^>]+>)?(?:\[\])?)?\s*=>/g,
    (match, params) => {
      const cleaned = params.replace(paramTypeRe, '$1')
      return `(${cleaned}) =>`
    }
  )

  result = result.replace(/\)\s*:\s*[A-Za-z_|&[\]{}]+(?=\s*{)/g, ')')

  const typeIdentifier = '[A-Za-z_$][\\w$]*'
  const typeReference = `${typeIdentifier}(?:<[^>]*>)?(?:\\[\\])*`
  const parenthesizedType = '\\([^)]*\\)(?:\\[\\])*'
  const unionIntersectionType = `(?:${typeReference}|${parenthesizedType})(?:\\s*[|&]\\s*(?:${typeReference}|${parenthesizedType}))*`
  result = result.replace(new RegExp(`\\s+as\\s+(?:const|${unionIntersectionType})`, 'g'), '')

  result = result.replace(/__IMPORT_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    return protectedImports[parseInt(index, 10)] || ''
  })

  result = result.replace(/(\w+)!\./g, '$1.')
  result = result.replace(/<[A-Za-z_$][\w$]*(?:<[^>]*>)?>\s*(?=\w)/g, '')

  // 非空断言处理
  result = result.replace(/(\w+!?\.\w+)(?![\w(])!+/g, '$1')
  result = result.replace(/(\)(?:\[[^\]]*\])?)!+/g, '$1')
  result = result.replace(/(?<![=!&|<>+\-*/%])\b(\w+)(?![\w(])!+(?![=])/g, '$1')
  result = result.replace(/(\?\.[\w$]+(?:\([^)]*\))?)!+/g, '$1')
  result = result.replace(/(\[[^\]]+\])!+/g, '$1')

  return result
}

/**
 * 将 SFC 源码中 <template> 内嵌的 <style> 提取到顶层。
 */
export function extractInlineTemplateStyles(sfcSource: string): string {
  const styles: string[] = []
  const cleanedSource = sfcSource.replace(
    /(<template[^>]*>)([\s\S]*?)(<\/template>)/g,
    (match, openTag, content, closeTag) => {
      const cleanedContent = content.replace(
        /<style[^>]*>([\s\S]*?)<\/style>/gi,
        (_styleMatch: string, styleContent: string) => {
          styles.push(styleContent)
          return ''
        }
      )
      return `${openTag}${cleanedContent}${closeTag}`
    }
  )

  if (styles.length === 0) return sfcSource

  const extractedStyleBlock = `<style>\n${styles.join('\n')}\n</style>\n`
  return cleanedSource + extractedStyleBlock
}

/**
 * 将 SFC 源码中的 <script lang="ts"> 预处理为 <script lang="js">。
 */
export function preprocessSfcTsToJs(sfcSource: string): string {
  return sfcSource.replace(
    /(<script[^>]*>)([\s\S]*?)(<\/script>)/g,
    (fullMatch, openTag, scriptContent, closeTag) => {
      const processedOpenTag = openTag.replace(/\blang\s*=\s*['"]ts['"]/g, 'lang="js"')
      return processedOpenTag + stripTypeAnnotations(scriptContent) + closeTag
    }
  )
}
