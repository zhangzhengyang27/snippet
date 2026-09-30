import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const S = (name, subcategory, description, language, code) => ({ name, subcategory, description, language, code })
const snippets = [
S('PostgreSQL 窗口函数实战','PostgreSQL','ROW_NUMBER/RANK/LAG/LEAD 窗口函数常用模式','sql',`-- 分组排名
SELECT department, employee_name, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank,
  DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dense_rank
FROM employees;

-- 同比/环比计算
SELECT month, revenue,
  LAG(revenue, 1) OVER (ORDER BY month) as prev_month,
  revenue - LAG(revenue, 1) OVER (ORDER BY month) as mom_change,
  ROUND((revenue - LAG(revenue, 1) OVER (ORDER BY month))::numeric / NULLIF(LAG(revenue, 1) OVER (ORDER BY month), 0) * 100, 2) as mom_pct
FROM monthly_revenue;

-- 连续登录天数
WITH login_groups AS (
  SELECT user_id, login_date,
    login_date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) as grp
  FROM (SELECT DISTINCT user_id, login_date::date FROM user_logins) t
)
SELECT user_id, MIN(login_date) as start_date, MAX(login_date) as end_date, COUNT(*) as consecutive_days
FROM login_groups GROUP BY user_id, grp ORDER BY consecutive_days DESC;`),
S('PostgreSQL JSONB 查询与索引','PostgreSQL','JSONB 字段的查询、更新和 GIN 索引优化','sql',`-- 创建 GIN 索引加速 JSONB 查询
CREATE INDEX idx_metadata_gin ON products USING GIN (metadata jsonb_path_ops);

-- 包含查询（@> 操作符，可利用 GIN 索引）
SELECT * FROM products WHERE metadata @> '{"color": "red", "size": "L"}';

-- 路径查询
SELECT metadata->>'brand' as brand, metadata->'specs'->>'weight' as weight
FROM products WHERE metadata->'specs'->>'material' = 'cotton';

-- 更新 JSONB 字段
UPDATE products SET metadata = metadata || '{"on_sale": true}'::jsonb WHERE id = 1;
UPDATE products SET metadata = metadata - 'deprecated_field' WHERE id = 1;
UPDATE products SET metadata = jsonb_set(metadata, '{specs,weight}', '"250g"') WHERE id = 1;

-- JSONB 数组查询
SELECT * FROM products WHERE metadata->'tags' @> '["electronics", "portable"]'::jsonb;
SELECT * FROM products WHERE metadata->'tags' ? 'clearance'; -- 包含某元素

-- 展开 JSONB 数组
SELECT p.id, tag.value::text as tag
FROM products p, jsonb_array_elements(p.metadata->'tags') tag;`),
S('PostgreSQL 全文搜索','PostgreSQL','使用 tsvector/tsquery 实现中文全文检索','sql',`-- 创建全文搜索列和索引
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);

-- 生成搜索向量（支持多字段权重）
UPDATE articles SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'C');

-- 自动更新触发器
CREATE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content,'')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search_vector BEFORE INSERT OR UPDATE OF title, content
  ON articles FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- 搜索查询（带排名）
SELECT id, title, ts_rank(search_vector, query) as rank
FROM articles, to_tsquery('simple', 'Vue & 组件') query
WHERE search_vector @@ query ORDER BY rank DESC LIMIT 20;

-- 高亮显示
SELECT id, ts_headline('simple', content, to_tsquery('simple', 'Vue'), 'MaxWords=30, MinWords=15') as snippet
FROM articles WHERE search_vector @@ to_tsquery('simple', 'Vue');`),
S('PostgreSQL 递归 CTE 树形查询','PostgreSQL','使用 WITH RECURSIVE 查询层级数据','sql',`-- 组织架构树（自顶向下）
WITH RECURSIVE org_tree AS (
  SELECT id, name, parent_id, 1 as level, ARRAY[id] as path
  FROM departments WHERE parent_id IS NULL
  UNION ALL
  SELECT d.id, d.name, d.parent_id, ot.level + 1, ot.path || d.id
  FROM departments d JOIN org_tree ot ON d.parent_id = ot.id
  WHERE NOT d.id = ANY(ot.path) -- 防止循环
)
SELECT repeat('  ', level - 1) || name as tree_view, id, level FROM org_tree ORDER BY path;

-- 所有子节点（含自身）
WITH RECURSIVE descendants AS (
  SELECT id, name, parent_id FROM departments WHERE id = 5
  UNION ALL
  SELECT d.id, d.name, d.parent_id FROM departments d JOIN descendants ds ON d.parent_id = ds.id
)
SELECT * FROM descendants;

-- 所有祖先节点（自底向上）
WITH RECURSIVE ancestors AS (
  SELECT id, name, parent_id FROM departments WHERE id = 42
  UNION ALL
  SELECT d.id, d.name, d.parent_id FROM departments d JOIN ancestors a ON d.id = a.parent_id
)
SELECT * FROM ancestors;

-- 分类树带路径名称
WITH RECURSIVE cat_path AS (
  SELECT id, name, name::text as full_path FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, cp.full_path || ' > ' || c.name FROM categories c JOIN cat_path cp ON c.parent_id = cp.id
)
SELECT id, full_path FROM cat_path ORDER BY full_path;`),
S('PostgreSQL 物化视图与刷新','PostgreSQL','物化视图加速复杂聚合查询','sql',`-- 创建物化视图（预计算每日销售统计）
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT date_trunc('day', created_at) as sale_date,
  category_id, COUNT(*) as order_count, SUM(amount) as total_amount, AVG(amount) as avg_amount
FROM orders WHERE status = 'completed'
GROUP BY 1, 2 WITH DATA;

CREATE UNIQUE INDEX idx_mv_daily_sales ON mv_daily_sales (sale_date, category_id);

-- 并发刷新（不阻塞读）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;

-- 定时刷新（配合 pg_cron）
SELECT cron.schedule('refresh-sales', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales');

-- 增量更新替代方案（触发器维护汇总表）
CREATE TABLE daily_sales_summary (sale_date date, category_id int, order_count int, total_amount numeric, PRIMARY KEY(sale_date, category_id));
CREATE FUNCTION update_summary() RETURNS trigger AS $$
BEGIN
  INSERT INTO daily_sales_summary (sale_date, category_id, order_count, total_amount)
  VALUES (NEW.created_at::date, NEW.category_id, 1, NEW.amount)
  ON CONFLICT (sale_date, category_id) DO UPDATE SET order_count = daily_sales_summary.order_count + 1, total_amount = daily_sales_summary.total_amount + EXCLUDED.total_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`),
S('MySQL 分区表策略','MySQL','按时间范围分区提升大表查询性能','sql',`-- 按月份范围分区
CREATE TABLE orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount DECIMAL(10,2),
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id, created_at),
  INDEX idx_user (user_id)
) PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
  PARTITION p202401 VALUES LESS THAN (202402),
  PARTITION p202402 VALUES LESS THAN (202403),
  PARTITION p202403 VALUES LESS THAN (202404),
  PARTITION p202404 VALUES LESS THAN (202405),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 查看分区信息
SELECT partition_name, table_rows, data_length FROM information_schema.partitions WHERE table_name = 'orders';

-- 添加新分区
ALTER TABLE orders REORGANIZE PARTITION p_future INTO (
  PARTITION p202405 VALUES LESS THAN (202406),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 删除旧分区（比 DELETE 快得多）
ALTER TABLE orders DROP PARTITION p202401;

-- 查询时自动分区裁剪
EXPLAIN SELECT * FROM orders WHERE created_at BETWEEN '2024-03-01' AND '2024-03-31';`),
S('数据库连接池配置','事务与并发','PostgreSQL/MySQL 连接池最佳实践','sql',`-- PostgreSQL pgBouncer 配置（transaction 模式）
-- pgbouncer.ini
-- [databases]
-- mydb = host=127.0.0.1 port=5432 dbname=myapp
-- [pgbouncer]
-- pool_mode = transaction        -- 事务级复用（推荐）
-- max_client_conn = 1000         -- 最大客户端连接
-- default_pool_size = 20         -- 每数据库默认池大小
-- min_pool_size = 5              -- 最小保持连接
-- reserve_pool_size = 5          -- 突发预留
-- reserve_pool_timeout = 3       -- 等待3秒后使用预留
-- server_idle_timeout = 600      -- 空闲连接回收
-- server_lifetime = 3600         -- 连接最大存活时间

-- Node.js pg-pool 配置
-- const pool = new Pool({
--   max: 20,                     -- 最大连接数
--   min: 2,                      -- 最小连接数
--   idleTimeoutMillis: 30000,    -- 空闲超时
--   connectionTimeoutMillis: 5000, -- 连接超时
--   statement_timeout: 30000,    -- 语句超时
--   maxUses: 7500,               -- 连接使用次数上限后回收
--   allowExitOnIdle: true        -- 空闲时允许进程退出
-- })

-- 监控连接池状态
SELECT count(*) as total, state, query_start, now() - query_start as duration
FROM pg_stat_activity WHERE datname = current_database() GROUP BY state, query_start ORDER BY duration DESC;`),
S('死锁检测与预防','事务与并发','数据库死锁分析、预防和自动重试','sql',`-- PostgreSQL 查看当前锁等待
SELECT blocked.pid as blocked_pid, blocked.query as blocked_query,
  blocking.pid as blocking_pid, blocking.query as blocking_query,
  now() - blocked.query_start as wait_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks kl ON kl.locktype = bl.locktype AND kl.relation = bl.relation AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
WHERE blocked.pid != blocking.pid;

-- 终止长时间阻塞的查询
SELECT pg_terminate_backend(blocking_pid) FROM (
  SELECT blocking.pid as blocking_pid FROM pg_stat_activity blocked
  JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
  JOIN pg_locks kl ON kl.locktype = bl.locktype AND kl.relation = bl.relation AND kl.granted
  JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
  WHERE now() - blocked.query_start > interval '30 seconds'
) t;

-- 预防死锁：统一加锁顺序
-- 规则：总是按主键升序加锁
-- BEGIN; SELECT * FROM accounts WHERE id IN (1,2) ORDER BY id FOR UPDATE; ... COMMIT;

-- 设置锁等待超时
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET deadlock_timeout = '1s'; -- 死锁检测间隔`),
S('Schema 迁移最佳实践','Schema 设计','零停机数据库迁移策略','sql',`-- 1. 添加列（安全，不锁表）
ALTER TABLE users ADD COLUMN avatar_url TEXT; -- PG11+ 不锁表
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'; -- 带默认值也安全

-- 2. 添加索引（并发，不阻塞写入）
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
-- 注意：CONCURRENTLY 不能在事务中执行

-- 3. 重命名列（安全但需应用兼容）
-- 步骤：先加新列 → 双写 → 迁移数据 → 切换读取 → 删旧列
ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
UPDATE users SET display_name = username WHERE display_name IS NULL;
-- 应用层双写 username + display_name
-- 确认无问题后：ALTER TABLE users DROP COLUMN username;

-- 4. 修改列类型（可能锁表！）
-- 安全方式：加新列 → 触发器同步 → 迁移 → 切换
ALTER TABLE orders ADD COLUMN amount_new NUMERIC(12,2);
CREATE FUNCTION sync_amount() RETURNS trigger AS $$ BEGIN NEW.amount_new := NEW.amount::numeric(12,2); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION sync_amount();
-- 后台批量迁移：UPDATE orders SET amount_new = amount::numeric(12,2) WHERE amount_new IS NULL AND id BETWEEN $1 AND $2;

-- 5. 删除列（先标记废弃）
-- 步骤：应用停止读写 → 等一个发布周期 → ALTER TABLE DROP COLUMN`),
S('数据归档策略','Schema 设计','大表历史数据归档方案','sql',`-- 方案1：表继承归档
CREATE TABLE orders_archive (CHECK (created_at < '2024-01-01')) INHERITS (orders);
-- 迁移旧数据
WITH moved AS (DELETE FROM orders WHERE created_at < '2024-01-01' RETURNING *)
INSERT INTO orders_archive SELECT * FROM moved;

-- 方案2：分区表 + DETACH 归档
-- 将旧分区 detach 后转为普通表或导出
ALTER TABLE orders DETACH PARTITION p202301;
-- 导出为文件：\\COPY (SELECT * FROM orders_p202301) TO '/archive/orders_202301.csv' CSV
DROP TABLE orders_p202301;

-- 方案3：批量删除（避免长事务锁表）
-- 使用循环小批量删除
DO $$ DECLARE batch_size INT := 10000; deleted INT; BEGIN
  LOOP
    DELETE FROM logs WHERE id IN (SELECT id FROM logs WHERE created_at < now() - interval '90 days' LIMIT batch_size);
    GET DIAGNOSTICS deleted = ROW_COUNT;
    EXIT WHEN deleted = 0;
    PERFORM pg_sleep(0.1); -- 避免 CPU 打满
  END LOOP;
END $$;

-- 归档表压缩存储
ALTER TABLE orders_archive SET (fillfactor = 100);
CLUSTER orders_archive USING idx_orders_archive_date;`),
S('PostgreSQL 行级安全策略','Schema 设计','使用 RLS 实现多租户数据隔离','sql',`-- 启用行级安全
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能看到自己的订单
CREATE POLICY orders_user_isolation ON orders
  USING (user_id = current_setting('app.current_user_id')::int)
  WITH CHECK (user_id = current_setting('app.current_user_id')::int);

-- 管理员可看所有
CREATE POLICY orders_admin_all ON orders
  USING (current_setting('app.current_role') = 'admin');

-- 应用层设置上下文（每次查询前）
-- await client.query("SET app.current_user_id = $1", [userId])
-- await client.query("SET app.current_role = $1", [role])

-- 多租户隔离
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- 强制策略（对表所有者也生效）
ALTER TABLE products FORCE ROW LEVEL SECURITY;`),
S('数据库备份与恢复','事务与并发','pg_dump/pg_restore 与 PITR 时间点恢复','sql',`-- 逻辑备份（自定义格式，支持并行恢复）
-- pg_dump -Fc -j 4 -d myapp -f backup.dump

-- 并行恢复
-- pg_restore -Fc -j 4 -d myapp backup.dump

-- 仅恢复表结构
-- pg_restore --schema-only -d myapp backup.dump

-- 仅恢复数据
-- pg_restore --data-only -d myapp backup.dump

-- 恢复单张表
-- pg_restore -d myapp -t orders backup.dump

-- WAL 归档配置（postgresql.conf）
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'cp %p /backup/wal/%f'

-- PITR 恢复（恢复到指定时间点）
-- 1. 恢复基础备份
-- pg_basebackup -D /data/restored -Ft -z -Xs -P
-- 2. 配置 recovery
-- restore_command = 'cp /backup/wal/%f %p'
-- recovery_target_time = '2024-03-15 14:30:00'
-- recovery_target_action = 'promote'

-- 验证备份完整性
-- pg_restore --list backup.dump > /dev/null && echo "OK"`),
S('Explain 查询计划分析','索引与优化','读懂 EXPLAIN ANALYZE 输出并优化慢查询','sql',`-- 基本用法（带实际执行时间）
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, count(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id, u.name HAVING count(o.id) > 5;

-- 关键指标解读：
-- Seq Scan: 全表扫描（大表时考虑加索引）
-- Index Scan: 索引扫描（良好）
-- Index Only Scan: 仅索引扫描（最优，无需回表）
-- Bitmap Heap Scan: 位图扫描（多条件组合）
-- Nested Loop: 嵌套循环（小数据集OK，大数据集慢）
-- Hash Join: 哈希连接（中等数据集高效）
-- Merge Join: 归并连接（已排序数据高效）

-- 常见问题与优化：
-- 1. rows removed by filter 很大 → 索引选择性不够，考虑复合索引
-- 2. Buffers: shared read 很大 → 数据不在缓存，考虑增大 shared_buffers
-- 3. Sort Method: external merge Disk → work_mem 不够，SET work_mem = '256MB'
-- 4. 估算行数 vs 实际行数差距大 → ANALYZE table 更新统计信息

-- 强制更新统计信息
ANALYZE VERBOSE orders;
-- 调整统计精度
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;`),
S('复合索引设计原则','索引与优化','复合索引列顺序和覆盖索引设计','sql',`-- 原则1：等值条件列在前，范围条件列在后
-- 查询: WHERE status = 'active' AND created_at > '2024-01-01' ORDER BY amount
CREATE INDEX idx_orders_composite ON orders (status, created_at, amount);

-- 原则2：选择性高的列在前（区分度大）
-- 查看列的选择性
SELECT column_name, n_distinct, n_distinct / reltuples as selectivity
FROM pg_stats JOIN pg_class ON relname = tablename WHERE tablename = 'orders';

-- 原则3：覆盖索引避免回表（INCLUDE）
CREATE INDEX idx_orders_covering ON orders (user_id, status) INCLUDE (amount, created_at);
-- 查询 SELECT amount, created_at FROM orders WHERE user_id=1 AND status='active' 可 Index Only Scan

-- 原则4：部分索引减小体积
CREATE INDEX idx_active_orders ON orders (created_at) WHERE status = 'active';
-- 只索引活跃订单，体积更小，查询更快

-- 原则5：表达式索引
CREATE INDEX idx_lower_email ON users (lower(email));
-- 查询 WHERE lower(email) = 'test@example.com' 可利用索引

-- 查看索引使用情况
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;

-- 查找未使用的索引（可考虑删除）
SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;`),
S('PostgreSQL 数组类型与查询','PostgreSQL','使用数组类型存储多值字段及高效查询','sql',`-- 创建含数组列的表
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  categories INT[] DEFAULT '{}'
);

-- GIN 索引加速数组查询
CREATE INDEX idx_articles_tags ON articles USING GIN (tags);

-- 包含查询
SELECT * FROM articles WHERE tags @> ARRAY['typescript', 'vue']; -- 同时包含
SELECT * FROM articles WHERE tags && ARRAY['react', 'vue']; -- 包含任一

-- 数组操作
UPDATE articles SET tags = tags || 'new-tag'; -- 追加
UPDATE articles SET tags = array_remove(tags, 'old-tag'); -- 移除
UPDATE articles SET tags = array_replace(tags, 'old', 'new'); -- 替换

-- 展开数组
SELECT id, unnest(tags) as tag FROM articles;

-- 数组聚合
SELECT array_agg(title) FROM articles WHERE 'typescript' = ANY(tags);

-- 数组长度过滤
SELECT * FROM articles WHERE array_length(tags, 1) > 3;

-- 去重追加（防止重复标签）
UPDATE articles SET tags = array(SELECT DISTINCT unnest(tags || ARRAY['new-tag'])) WHERE id = 1;`),
S('数据库连接池监控','日志与监控','连接池状态监控与慢查询告警','sql',`-- 查看当前活跃连接
SELECT pid, usename, state, query_start, now() - query_start as duration, left(query, 100) as query
FROM pg_stat_activity WHERE datname = current_database() AND state != 'idle' ORDER BY duration DESC;

-- 连接数统计
SELECT state, count(*) FROM pg_stat_activity WHERE datname = current_database() GROUP BY state;

-- 慢查询检测（运行超过5秒）
SELECT pid, now() - query_start as duration, query FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds' AND pid != pg_backend_pid();

-- 表膨胀检测
SELECT schemaname, relname, n_live_tup, n_dead_tup, round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_pct, last_vacuum, last_autovacuum
FROM pg_stat_user_tables WHERE n_dead_tup > 1000 ORDER BY n_dead_tup DESC;

-- 索引命中率
SELECT relname, round(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as idx_hit_pct
FROM pg_stat_user_tables WHERE seq_scan + idx_scan > 0 ORDER BY idx_hit_pct ASC;

-- 缓存命中率
SELECT round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 4) as cache_hit_ratio FROM pg_stat_database WHERE datname = current_database();`),
S('Prisma Schema 设计模式','Schema 设计','Prisma ORM 常见关系建模与最佳实践','sql',`// schema.prisma - 多对多关系（隐式）
model Article {
  id        Int      @id @default(autoincrement())
  title     String
  tags      Tag[]    // 隐式多对多，Prisma 自动创建中间表
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  @@index([authorId])
}
model Tag {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  articles Article[]
}

// 多对多关系（显式中间表，需要额外字段时）
model Enrollment {
  id         Int      @id @default(autoincrement())
  student    Student  @relation(fields: [studentId], references: [id])
  studentId  Int
  course     Course   @relation(fields: [courseId], references: [id])
  courseId   Int
  enrolledAt DateTime @default(now())
  grade      Float?
  @@unique([studentId, courseId])
  @@index([courseId])
}

// 软删除模式
model Post {
  id        Int       @id @default(autoincrement())
  title     String
  deletedAt DateTime?
  @@index([deletedAt]) // 查询时 WHERE deletedAt IS NULL
}

// 审计字段 mixin
model Order {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy Int?
  updatedBy Int?
}`)
]
const output = { category: 'database', description: '数据库代码片段库（第二批），覆盖窗口函数、JSONB、全文搜索、递归CTE、物化视图、分区表、RLS、索引优化、备份恢复等。', fields: ['name','language','code','description'], count: snippets.length, snippets }
writeFileSync(resolve(import.meta.dirname, '..', 'snippets-database-2.json'), JSON.stringify(output, null, 2))
console.log(`✅ snippets-database-2.json: ${snippets.length} 个片段`)
