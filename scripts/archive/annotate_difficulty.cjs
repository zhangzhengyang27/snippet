/**
 * 为全库片段自动标注难度（display_attrs.difficulty）。
 *
 * 评分基于有效代码行数 + 高级特性复杂度计数（在 PostgreSQL 内计算，避免 CSV 解析）。
 * 分档（绝对业务规则）：
 *  - 入门(beginner)：有效行 ≤ 10 且 复杂特性 ≤ 1 且 非多文件
 *  - 高级(advanced)：多文件 或 有效行 ≥ 60 或 复杂特性 ≥ 4
 *  - 其余：进阶(intermediate)
 *
 * 用法：
 *   node scripts/annotate_difficulty.cjs            # 统计评分分布
 *   node scripts/annotate_difficulty.cjs --plan     # 预览分档
 *   node scripts/annotate_difficulty.cjs --apply    # 执行写库
 */
const { execSync } = require('child_process')
const fs = require('fs')

const DB = 'postgresql://root:root1234@localhost:5432/html5_examples'

function psql(sql) {
  return execSync(`psql "${DB}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    maxBuffer: 400 * 1024 * 1024,
  })
}

// 复杂度关键词（单引号已转义，用于 SQL regexp_count）
const ADV_PATTERNS_SQL = [
  `\\b(class|interface|extends|implements|abstract|enum|static)\\b`,
  `\\b(async|await|Promise|Observable)\\b`,
  `<[A-Z][A-Za-z0-9_]*(\\s*,\\s*[A-Z][A-Za-z0-9_]*)*>`,
  `\\b(Thread|Executor|synchronized|ConcurrentHashMap|CompletableFuture|goroutine|Channel|Future|task|actor)\\b`,
  `\\b(singleton|factory|observer|decorator|proxy|strategy|middleware|pipeline|EventEmitter|useState|useEffect|useMemo|useReducer|useRef|useCallback|componentDidCatch|getDerivedStateFromError|createContext|useContext)\\b`,
  `\\b(import|require)\\(`,
  `\\b(recursive|递归|二叉树|拓扑|动态规划|并发|分布式|微服务|消息队列)\\b`,
  `\\b(lambda|stream|collect\\(|yield|generator|生成器|迭代器|CompletableFuture|ExecutorService)\\b`,
]

// 构造统计查询：每片段返回 {id, language, lines, cc, multi}
const ccExpr = ADV_PATTERNS_SQL.map((p) => `regexp_count(snippet.content, '${p}')`).join(' + ')

// 有效行数：非空、非 // 或 # 注释开头的行数（SQL 数组过滤）
const linesExpr = `cardinality(ARRAY(
  SELECT trim(x) FROM unnest(string_to_array(snippet.content, E'\\n')) x
  WHERE trim(x) <> '' AND trim(x) !~ '^(//|#)'
))`

const multiExpr = `CASE WHEN jsonb_typeof(snippet.display_attrs->'files') = 'array' THEN jsonb_array_length(snippet.display_attrs->'files') ELSE 0 END`

const STAT_SQL = `SELECT json_agg(row_to_json(t)) FROM (
  SELECT
    snippet.id,
    snippet.language,
    COALESCE(snippet.name, '') AS name,
    COALESCE(snippet.description, '') AS description,
    (${linesExpr}) AS lines,
    (${ccExpr}) AS cc,
    (${multiExpr}) AS multi
  FROM ui_knowledge_snippets snippet
) t`
