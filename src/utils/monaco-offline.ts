/**
 * Monaco 离线化（构建期打包，消除对 CDN 的运行时依赖）。
 *
 * ## 问题
 * `MonacoCodeEditor` 基于 `@guolao/vue-monaco-editor`，其底层
 * `@monaco-editor/loader` **默认在运行时从 `cdn.jsdelivr.net` 拉取** Monaco，
 * 而全仓没有任何 `loader.config` 调用。后果：**内网 / 离线环境下代码编辑器
 * 完全加载不出来**，且是静默失败（页面只是空白，不报错）。
 *
 * 本项目已有离线化先例（图标已改为构建期注入本地数据，摆脱
 * `api.iconify.design`），说明**离线是部署要求**，故 Monaco 一并对齐。
 *
 * ## 做法
 * 1. 把已安装的 `monaco-editor` 真正打进产物（此前它只被 `import type` 引用，
 *    从未进入 bundle）；
 * 2. `loader.config({ monaco })` 告诉 loader 用本地实例，不再联网；
 * 3. 配置 `MonacoEnvironment.getWorker`，让语言服务跑在 Web Worker 里
 *    （不配置会退化为主线程模式，补全/诊断功能缺失并打印警告）。
 *
 * ## 代价
 * 产物增大（monaco-editor 打包后约 2–3 MB，gzip 后约 700 KB–1 MB）。
 * 因此本模块**只在 `MonacoCodeEditor` 内部副作用引入**，不放进 `main.ts`，
 * 以便与编辑器一起被代码分割，不拖累首屏。
 *
 * 若将来只需要「语法高亮」而不需要「智能提示」，可改用 shiki / highlight.js
 * 进一步把体积降一个数量级 —— 那属于另一个量级的取舍，需要单独评估。
 */
import * as monaco from 'monaco-editor'
import { loader } from '@guolao/vue-monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

/** 按 Monaco 的语言标签分发到对应 worker */
function getWorker(_workerId: string, label: string): Worker {
  switch (label) {
    case 'json':
      return new jsonWorker()
    case 'css':
    case 'scss':
    case 'less':
      return new cssWorker()
    case 'html':
    case 'handlebars':
    case 'razor':
      return new htmlWorker()
    case 'typescript':
    case 'javascript':
      return new tsWorker()
    default:
      return new editorWorker()
  }
}

// 全局环境：Monaco 通过 self.MonacoEnvironment 找到 worker 工厂
;(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = { getWorker }

// 关键一步：把 loader 指向本地实例，此后不再访问 CDN
loader.config({ monaco })

export { monaco }
