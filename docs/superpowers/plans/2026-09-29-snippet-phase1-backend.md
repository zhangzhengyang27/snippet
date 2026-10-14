# Snippet Phase 1（端到端跑通）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 snippet 后端至可运行，本地 docker PG + 种子数据 + 前后端联调，全链路可用。

**Architecture:** 以原 `/Users/xiaoye/Desktop/html5-examples/server` 为基线合并恢复文件到 `nas-projects/snippet-server`，按 YAGNI 裁剪 app.module 只装配 Auth/Examples/Favorites/KnowledgeSnippets 四模块（7 张表），手写缺失的 4 个实体、2 个 service、4 个 module 与守卫/工具，docker compose 起 PostgreSQL，幂等种子脚本导入恢复时找回的真实片段 JSON。

**Tech Stack:** NestJS 10 + TypeORM 0.3 + PostgreSQL 16 + bcryptjs/passport-jwt；前端 Vue3 + Vite（已就绪，仅联调）。

**Spec:** `docs/superpowers/specs/2026-09-29-snippet-completion-design.md`

## Global Constraints

- 后端根目录：`/Users/xiaoye/Desktop/20260810/nas-projects/snippet-server`（下称 SRV）；原版参考：`/Users/xiaoye/Desktop/html5-examples/server`（下称 ORIG）
- 表主键约定：知识片段域 = varchar(12) NanoID（`generateId()`）；User = uuid；Favorite = uuid 自动生成
- 全局 `JwtAuthGuard` 必须为**宽容模式**（无凭证放行，`req.user` 为 undefined）；写接口用 `RequireAuthGuard` 强制登录（knowledge-snippets.controller.ts 头注释为规范原文）
- 认证：仅 login/logout/me；默认管理员 admin（`ADMIN_DEFAULT_PASSWORD`；未设置时用内置弱口令并告警）
- 前端端口 5556（vite proxy /api→http://localhost:3000），后端 CORS 允许 5556；PG 用本机 5433 端口（避让 5432）
- 禁止把 ORIG 的 `.env`（含真实 OSS 密钥）复制到任何新位置；新 `.env` 只含 DB/JWT/ADMIN/PORT
- snippets JSON 种子来自 ORIG 根目录三份文件（code-snippets.json / snippets-frontend.json / snippets-shell.json）
- 完成标准以 spec「联调验证」checkbox 为准；前端 `vue-tsc`/`vitest` 保持全绿不得回退

## Review Focus

1. **无 token 访问 GET /api/knowledge/snippets**：应 200 并返回公共片段，而非 401（宽容模式守卫是否生效）→ Task 5 Step 3 curl 验证
2. **登录用户与公共数据隔离**：admin 登录后 list 应包含 admin 私有片段；匿名只见公共 → Task 6 Step 5 用两种身份 curl 对比
3. **examples 列表分页契约**：响应必须为 `{ data, pagination: { page, limit, total, totalPages } }`（前端 Dashboard/示例库按此取 `exRes.pagination.total`）→ Task 3 Step 4 curl 验证
4. **收藏未登录**：GET /api/favorites 匿名应 401（RequireAuthGuard），前端已按「未登录 catch 空数组」处理 → Task 5 Step 3 验证 401 而非 500
5. **种子幂等**：seed 脚本连跑两遍，片段数量不变、无重复名 → Task 6 Step 4

---

### Task 1: 服务端基线整理（合并三源，归档越界文件）

**Files:**
- Modify: SRV 整目录（拷贝 ORIG 基础设施）
- Create: SRV/_archive/（越界文件归档，保留不删）

**Interfaces:**
- Produces: 可编译的 src 骨架（含 dto/decorators/guards/strategy/id.util/favorites.service/3 个 knowledge 实体/data-source），供后续任务补文件

- [ ] **Step 1: 从 ORIG 拷入缺失的基础设施与共享文件**

```bash
SRV=/Users/xiaoye/Desktop/20260810/nas-projects/snippet-server
ORIG=/Users/xiaoye/Desktop/html5-examples/server
cp -n $ORIG/package.json $ORIG/tsconfig.json $ORIG/eslint.config.js $ORIG/data-source.ts $SRV/
mkdir -p $SRV/src/common/utils $SRV/src/modules/knowledge/entities
cp -n $ORIG/src/common/utils/id.util.ts $SRV/src/common/utils/
cp -n $ORIG/src/data-source.ts $SRV/src/
cp -n $ORIG/src/modules/knowledge/entities/*.entity.ts $SRV/src/modules/knowledge/entities/
cp -n $ORIG/src/modules/auth/decorators/public.decorator.ts $SRV/src/modules/auth/decorators/ 2>/dev/null || mkdir -p $SRV/src/modules/auth/decorators && cp $ORIG/src/modules/auth/decorators/public.decorator.ts $SRV/src/modules/auth/decorators/
cp -n $ORIG/src/modules/favorites/favorites.service.ts $SRV/src/modules/favorites/
# 数据源文件不拷 .env（含真实 OSS 密钥）
```

- [ ] **Step 2: 归档不会被装配的越界文件（drive/图表/画布/UI 模板/静态站/主题等）**

```bash
cd $SRV/src/modules
mkdir -p ../../_archive
mv knowledge/drive _archive/drive 2>/dev/null
mv knowledge/knowledge.controller.ts _archive/ 2>/dev/null
mv canvas-examples chart-examples static-site-nav topics ui-elements _archive/ 2>/dev/null
# 对应的 controller 若在 examples 等目录外无残留依赖即可；逐个检查：
cd $SRV && grep -rn "drive\|canvas-examples\|chart-examples\|static-site-nav\|ui-elements\|topics" src --include="*.ts" -l
# 输出应只含 app.module.ts（Task 4 重写时清掉）
```

- [ ] **Step 3: 校验 dtos.ts 只保留 Auth 与通用 DTO**

Run: `grep -n "export class" $SRV/src/common/dtos.ts`
Expected: 至少有 `LoginDto`；其余 Topic/Example 等域的 DTO 留着无害（仅类定义，无外部依赖），不强制删除。

- [ ] **Step 4: 提交**

```bash
cd $SRV && git init -q 2>/dev/null; git add -A && git commit -q -m "chore: 合并原 server 基础设施，归档 snippet 不使用的模块文件"
```

### Task 2: 补 4 个实体 + 分页工具

**Files:**
- Create: `src/modules/auth/entities/user.entity.ts`
- Create: `src/modules/examples/entities/example.entity.ts`
- Create: `src/modules/favorites/entities/favorite.entity.ts`
- Create: `src/modules/knowledge/entities/knowledge-snippet-tag.entity.ts`
- Create: `src/common/utils/pagination.util.ts`

**Interfaces:**
- Produces: `User{id:uuid, username, password, role, createdAt}`、`Example{id:string(12), title, description, category, categorySlug, topicSlug, tags:string[], language, sourceFile, sourceLine, sourceGroup, difficulty, isInteractive, html, css, js, snippets, createdAt, updatedAt}`、`Favorite{id:uuid, userId, exampleId, createdAt}`、`KnowledgeSnippetTag{id:string(12), name(unique), createdAt}`、`clampPage(v?,max?):number / clampPageSize(v?,def?,max?):number`

- [ ] **Step 1: 写 user.entity.ts**

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  username!: string;

  @Column({ name: 'password', type: 'varchar', length: 100 })
  password!: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

- [ ] **Step 2: 写 example.entity.ts（字段=前端 CodeExample + controller 查询参数）**

```typescript
import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { generateId } from '../../../common/utils/id.util';

@Entity('examples')
export class Example {
  @PrimaryColumn({ type: 'varchar', length: 12, default: () => `''` })
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 80, default: '通用' })
  category!: string;

  @Index()
  @Column({ name: 'category_slug', type: 'varchar', length: 80, default: 'general' })
  categorySlug!: string;

  @Index()
  @Column({ name: 'topic_slug', type: 'varchar', length: 80, default: 'general' })
  topicSlug!: string;

  @Column({ type: 'jsonb', default: [] })
  tags!: string[];

  @Column({ type: 'varchar', length: 40, default: 'html' })
  language!: string;

  @Column({ name: 'source_file', type: 'varchar', length: 300, nullable: true })
  sourceFile!: string | null;

  @Column({ name: 'source_line', type: 'int', nullable: true })
  sourceLine!: number | null;

  @Column({ name: 'source_group', type: 'varchar', length: 120, nullable: true })
  sourceGroup!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  difficulty!: string | null;

  @Column({ name: 'is_interactive', default: false })
  isInteractive!: boolean;

  @Column({ type: 'text', nullable: true })
  html!: string | null;

  @Column({ type: 'text', nullable: true })
  css!: string | null;

  @Column({ type: 'text', nullable: true })
  js!: string | null;

  @Column({ type: 'jsonb', default: [] })
  snippets!: Array<{ label: string; html?: string; css?: string; js?: string }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
```

> 注：NanoID 默认值需在 service create 里用 `generateId()` 赋值（`default: () => "''"` 仅为占位避免 NOT NULL 冲突）；examples.service create 时先 `example.id = generateId()`。

- [ ] **Step 3: 写 favorite.entity.ts**

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('favorites')
@Index(['userId', 'exampleId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'example_id', type: 'varchar', length: 12 })
  exampleId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

- [ ] **Step 4: 写 knowledge-snippet-tag.entity.ts（TagLink 已引用它）**

```typescript
import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';
import { generateId } from '../../../common/utils/id.util';

@Entity('ui_knowledge_snippet_tags')
export class KnowledgeSnippetTag {
  @PrimaryColumn({ type: 'varchar', length: 12, default: () => `''` })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

- [ ] **Step 5: 写 pagination.util.ts（语义：默认 1/20，钳制 1..1000 与 1..100）**

```typescript
/** 分页参数钳制：非法值回退默认，超界取边界。 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE = 100000;
export const MAX_PAGE_SIZE = 100;

export function clampPage(value: unknown, max = MAX_PAGE): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE;
  return Math.min(n, max);
}

export function clampPageSize(value: unknown, def = DEFAULT_PAGE_SIZE, max = MAX_PAGE_SIZE): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}
```

> 对照：knowledge-snippets.service 里 `clampPage(query.page)`、`clampPageSize(query.pageSize)` 两参调用可省略默认值，签名兼容。

- [ ] **Step 6: 提交**

```bash
cd $SRV && git add -A && git commit -q -m "feat(server): 补 user/example/favorite/tag 实体与分页工具"
```

### Task 3: 补 snippet-version.service 与 examples.service

**Files:**
- Create: `src/modules/knowledge/snippets/snippet-version.service.ts`
- Create: `src/modules/examples/examples.service.ts`

**Interfaces:**
- Consumes: `Example` 实体、`generateId()`、`clampPage/clampPageSize`
- Produces: `ExamplesService.findAll(f: ExampleFilters, p: {page:number;limit:number}): Promise<{data:Example[];pagination:{page;limit;total;totalPages}}>`、`findOne(id)`、`create(dto)`、`update(id,dto)`、`remove(id)`；`SnippetVersionService`（可注入空实现，方法待版本 UI 启用时扩展）

- [ ] **Step 1: 先确认 knowledge-snippets.service 对 version service 的实际调用面**

Run: `grep -n "snippetVersionService\." $SRV/src/modules/knowledge/snippets/knowledge-snippets.service.ts`
Expected: 若无调用 → 最小可注入类即可；若有调用 → 按列出方法逐个实现（用 DataSource 手写 SQL 查 `ui_knowledge_snippet_versions` 表结构可从调用处参数推断）。

- [ ] **Step 2: 写 snippet-version.service.ts（最小实现）**

```typescript
import { Injectable } from '@nestjs/common';

/**
 * 片段版本服务（最小实现）。
 * 原设计中每次保存写入版本快照、支持列表/回滚/删除；当前前端未接入版本 UI
 * （见前端 useSnippetVersions.ts 裁剪注释），controller 的 /versions 路由保留但
 * 返回空集。恢复版本 UI 时在此补齐快照写入与查询。
 */
@Injectable()
export class SnippetVersionService {
  async listVersions(_snippetId: string) {
    return [];
  }

  async getVersion(_snippetId: string, _versionId: string) {
    return null;
  }

  async deleteVersion(_snippetId: string, _versionId: string) {
    return { ok: true };
  }

  async rollback(_snippetId: string, _versionId: string) {
    return { ok: false };
  }
}
```

- [ ] **Step 3: 写 examples.service.ts（契约=examples.controller：多条件过滤+分页+CRUD）**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from './entities/example.entity';
import { generateId } from '../../common/utils/id.util';
import { clampPage, clampPageSize } from '../../common/utils/pagination.util';

export interface ExampleFilters {
  topicSlug?: string;
  categorySlug?: string;
  search?: string;
  isInteractive?: boolean;
  sourceFilePrefix?: string;
  sourceGroup?: string;
  ids?: string[];
}

@Injectable()
export class ExamplesService {
  constructor(
    @InjectRepository(Example)
    private exampleRepository: Repository<Example>,
  ) {}

  async findAll(filters: ExampleFilters, page: { page: number; limit: number }) {
    const pageNum = clampPage(page.page);
    const limit = clampPageSize(page.limit);

    const qb = this.exampleRepository.createQueryBuilder('example').orderBy('example.createdAt', 'DESC');

    if (filters.topicSlug) qb.andWhere('example.topicSlug = :topicSlug', { topicSlug: filters.topicSlug });
    if (filters.categorySlug) qb.andWhere('example.categorySlug = :categorySlug', { categorySlug: filters.categorySlug });
    if (filters.isInteractive !== undefined) qb.andWhere('example.isInteractive = :isInteractive', { isInteractive: filters.isInteractive });
    if (filters.sourceFilePrefix) qb.andWhere('example.sourceFile LIKE :prefix', { prefix: `${filters.sourceFilePrefix}%` });
    if (filters.sourceGroup) qb.andWhere('example.sourceGroup = :sourceGroup', { sourceGroup: filters.sourceGroup });
    if (filters.ids?.length) qb.andWhere('example.id IN (:...ids)', { ids: filters.ids });
    if (filters.search) {
      qb.andWhere('(example.title ILIKE :q OR example.description ILIKE :q OR example.tags::text ILIKE :q)', {
        q: `%${filters.search}%`,
      });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((pageNum - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      pagination: { page: pageNum, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOne(id: string) {
    const example = await this.exampleRepository.findOne({ where: { id } });
    if (!example) throw new NotFoundException(`示例 ${id} 不存在`);
    return example;
  }

  async create(exampleData: Partial<Example>) {
    const example = this.exampleRepository.create({ ...exampleData, id: generateId() });
    return this.exampleRepository.save(example);
  }

  async update(id: string, exampleData: Partial<Example>) {
    const example = await this.findOne(id);
    Object.assign(example, exampleData);
    return this.exampleRepository.save(example);
  }

  async remove(id: string) {
    const example = await this.findOne(id);
    await this.exampleRepository.remove(example);
    return { ok: true };
  }
}
```

- [ ] **Step 4: curl 验证分页契约（依赖 Task 5 启动后执行；若先到本任务仅编译检查）**

Run: `curl -s 'http://localhost:3000/api/examples?page=1&limit=2' | python3 -m json.tool | head -20`
Expected: `{"data":[...],"pagination":{"page":1,"limit":2,"total":N,"totalPages":M}}`

- [ ] **Step 5: 提交**

```bash
cd $SRV && git add -A && git commit -q -m "feat(server): examples 服务与片段版本最小实现"
```

### Task 4: 四个 module + app.module 重写 + main.ts 与守卫

**Files:**
- Create: `src/modules/auth/auth.module.ts`
- Create: `src/modules/examples/examples.module.ts`
- Create: `src/modules/favorites/favorites.module.ts`
- Create: `src/modules/knowledge/snippets/knowledge-snippets.module.ts`
- Create: `src/modules/auth/guards/require-auth.guard.ts`
- Modify: `src/app.module.ts`（整体重写）
- Modify: `src/main.ts`（去 admin 静态托管相关启动日志即可，文件本身保留）
- Modify: `src/modules/auth/guards/jwt-auth.guard.ts`（改宽容模式）

**Interfaces:**
- Consumes: 前两个 Task 的实体与服务
- Produces: 可启动的 NestApplication；`RequireAuthGuard`（无 user 时 401）

- [ ] **Step 1: 写 require-auth.guard.ts（宽容全局守卫的强制版）**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** 强制登录守卫：全局宽容 JwtAuthGuard 放行的匿名请求在此拦截。 */
@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.userId) {
      throw new UnauthorizedException('请先登录');
    }
    return true;
  }
}
```

- [ ] **Step 2: 把 jwt-auth.guard.ts 改为宽容模式**

先读现文件，把「无有效凭证抛 401」的 `handleRequest` 默认行为改为：无凭证 → `request.user = undefined` 并放行；有凭证但校验失败 → 抛 401。实现：

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 全局 JWT 守卫（宽容模式）：
 *  - 未携带凭证：放行，request.user 为 undefined（匿名只读公共数据）
 *  - 携带凭证但无效/过期：401（避免坏 token 被当匿名造成误导）
 * 写接口另叠加 RequireAuthGuard 强制登录。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser | false, info: Error): TUser {
    if (err || (info && user === false && info.name !== 'NoAuthInfoFoundError')) {
      // 有凭证但校验失败
      if (info || err) throw err || info;
    }
    return (user ?? undefined) as TUser;
  }
}
```

> 注：passport 的 `NoAuthInfoFoundError` 名称以实际抛出为准——联调时匿名 curl 401 则把 info.name 分支调对，验收标准是 Review Focus #1。

- [ ] **Step 3: 写 auth.module.ts（含启动建 admin）**

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}
  async onModuleInit() {
    await this.authService.createDefaultAdmin();
  }
}
```

- [ ] **Step 4: 写 examples.module.ts / favorites.module.ts**

```typescript
// examples.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamplesController } from './examples.controller';
import { ExamplesService } from './examples.service';
import { Example } from './entities/example.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Example])],
  controllers: [ExamplesController],
  providers: [ExamplesService],
})
export class ExamplesModule {}
```

```typescript
// favorites.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { Favorite } from './entities/favorite.entity';
import { Example } from '../examples/entities/example.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Example])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
```

- [ ] **Step 5: 写 knowledge-snippets.module.ts**

先 grep service 构造器注入的 repo（`grep -n "@InjectRepository" src/modules/knowledge/snippets/knowledge-snippets.service.ts`），按结果注册实体（应为 KnowledgeSnippet、SnippetCollection、KnowledgeSnippetTag、KnowledgeSnippetTagLink + DataSource）：

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeSnippetsController } from './knowledge-snippets.controller';
import { KnowledgeSnippetsService } from './knowledge-snippets.service';
import { SnippetVersionService } from './snippet-version.service';
import { KnowledgeSnippet } from '../entities/knowledge-snippet.entity';
import { SnippetCollection } from '../entities/snippet-collection.entity';
import { KnowledgeSnippetTag } from '../entities/knowledge-snippet-tag.entity';
import { KnowledgeSnippetTagLink } from '../entities/knowledge-snippet-tag-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeSnippet,
      SnippetCollection,
      KnowledgeSnippetTag,
      KnowledgeSnippetTagLink,
    ]),
  ],
  controllers: [KnowledgeSnippetsController],
  providers: [KnowledgeSnippetsService, SnippetVersionService],
})
export class KnowledgeSnippetsModule {}
```

- [ ] **Step 6: 重写 app.module.ts（7 实体 + 4 模块，全局宽容守卫）**

```typescript
import { Module } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { User } from './modules/auth/entities/user.entity';
import { Example } from './modules/examples/entities/example.entity';
import { Favorite } from './modules/favorites/entities/favorite.entity';
import { SnippetCollection } from './modules/knowledge/entities/snippet-collection.entity';
import { KnowledgeSnippet } from './modules/knowledge/entities/knowledge-snippet.entity';
import { KnowledgeSnippetTag } from './modules/knowledge/entities/knowledge-snippet-tag.entity';
import { KnowledgeSnippetTagLink } from './modules/knowledge/entities/knowledge-snippet-tag-link.entity';
import { AuthModule } from './modules/auth/auth.module';
import { ExamplesModule } from './modules/examples/examples.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { KnowledgeSnippetsModule } from './modules/knowledge/snippets/knowledge-snippets.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'html5_examples',
      entities: [User, Example, Favorite, SnippetCollection, KnowledgeSnippet, KnowledgeSnippetTag, KnowledgeSnippetTagLink],
      synchronize: process.env.DB_SYNC === 'true',
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    ExamplesModule,
    FavoritesModule,
    KnowledgeSnippetsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
```

- [ ] **Step 7: 提交**

```bash
cd $SRV && git add -A && git commit -q -m "feat(server): 裁剪版模块装配与宽容模式全局守卫"
```

### Task 5: 本地数据库 + 启动冒烟

**Files:**
- Create: `docker-compose.yml`（SRV 根）
- Create: `.env`、`.env.example`（SRV 根）

**Interfaces:**
- Produces: localhost:5433 PG（库 html5_examples）+ localhost:3000 API

- [ ] **Step 1: 写 docker-compose.yml 与 .env**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: snippet-pg
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: ${DB_PASSWORD:?}
      POSTGRES_DB: html5_examples
    ports:
      - '5433:5432'
    volumes:
      - snippet_pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  snippet_pgdata:
```

`.env`（SRV 根；不含 OSS）：

```
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=root
DB_PASSWORD=<你的数据库密码>
DB_NAME=html5_examples
DB_SYNC=true

JWT_SECRET=snippet-dev-secret-change-me
JWT_EXPIRES_IN=7d

ADMIN_DEFAULT_PASSWORD=<请替换为强口令>

PORT=3000
NODE_ENV=development
TZ=Asia/Shanghai
```

`.env.example` 同内容（JWT_SECRET 用占位文本）。

- [ ] **Step 2: 启动 PG 并安装依赖、起服务**

```bash
cd $SRV && docker compose up -d
npm install --legacy-peer-deps
npm run build || npx nest build   # 编译错在此暴露并修复（预期：AppController/缺失依赖残留）
npx nest start &                  # 或 npm run start:dev；等 "Nest application successfully started"
```

- [ ] **Step 3: 冒烟 curl（Review Focus #1/#4 钉死）**

```bash
curl -s http://localhost:3000/api/examples | head -c 200          # 期望 {"data":[],"pagination":...}
curl -s http://localhost:3000/api/knowledge/snippets | head -c 200 # 期望 200（宽容模式），非 401
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/favorites   # 期望 401
curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"$ADMIN_DEFAULT_PASSWORD"}' | head -c 200    # 期望 access_token
```

- [ ] **Step 4: 提交**

```bash
cd $SRV && git add -A && git commit -q -m "feat(server): 本地 PG compose 与开发环境配置"
```

### Task 6: 种子数据（真实片段导入）

**Files:**
- Create: `scripts/seed-from-exports.ts`

**Interfaces:**
- Consumes: ORIG 根目录 `code-snippets.json`、`snippets-frontend.json`、`snippets-shell.json`；DataSource
- Produces: 公共集合树（前端/常用代码片段）+ 公共片段若干 + 3 条示例 example

- [ ] **Step 1: 先看三份 JSON 的真实结构再定映射**

Run: `python3 -c "import json;d=json.load(open('/Users/xiaoye/Desktop/html5-examples/code-snippets.json'));print(type(d).__name__); print(list(d.keys())[:8] if isinstance(d,dict) else d[:1])"`
（snippets-frontend.json / snippets-shell.json 同样探一遍；种子脚本按实际结构写映射，字段缺失容错跳过并打印跳过原因。）

- [ ] **Step 2: 写 seed 脚本（幂等：集合按名查、片段按 name+collectionId 查重）**

骨架（映射代码在 Step 1 探明结构后填写，硬性要求）：使用 `dataSource` 初始化 →
`SnippetCollection` 建「前端」根集合（isPublic=true, userId=null, parentId=null，已存在跳过）→
子集合「常用代码片段」→ 逐条 `KnowledgeSnippet`（isPublic=true, userId=null, language 从数据映射，
displayAttrs 走 `snippetDisplayDefaults` 归一化）→ 另建 3 条 Example（防抖节流演示/弹性盒布局/Canvas 粒子，
html/css/js 内联小示例）→ 打印各表计数。运行方式：

```bash
cd $SRV && npx tsx -r reflect-metadata scripts/seed-from-exports.ts
```

- [ ] **Step 3: 跑种子并验证计数**

Run: 上面命令两次。
Expected: 第二次输出「跳过已存在」且各表计数不变。

- [ ] **Step 4: 双身份数据隔离验证（Review Focus #2）**

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"$ADMIN_DEFAULT_PASSWORD"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])')
# admin 建一条私有片段
curl -s -X POST localhost:3000/api/knowledge/snippets -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"admin私有片段","content":"console.log(1)","language":"javascript","collectionId":null}' | head -c 120
# 匿名列表不含它；admin 列表含它
curl -s 'localhost:3000/api/knowledge/snippets?pageSize=100' | grep -c admin私有片段   # 期望 0
curl -s 'localhost:3000/api/knowledge/snippets?pageSize=100' -H "Authorization: Bearer $TOKEN" | grep -c admin私有片段  # 期望 1
```

- [ ] **Step 5: 提交**

```bash
cd $SRV && git add -A && git commit -q -m "feat(server): 真实片段种子脚本（幂等）与示例数据"
```

### Task 7: 前端联调全链路走查

**Files:** 无新增（修 bug 时按最小改动改前端或后端）

- [ ] **Step 1: 起前端**

```bash
cd /Users/xiaoye/Desktop/20260810/nas-projects/snippet && npm run dev  # 5556
```

- [ ] **Step 2: 按 spec 联调清单逐项验证并记录**

登录 admin → 集合树/片段列表/详情/新建/编辑/删除/拖拽 → 搜索+⌘K → 收藏 → 概览/最近/收藏页 → 示例库列表+详情 → 导出/导入回灌。每项在终端记录 PASS/FAIL；FAIL 逐个修（前端契约优先，改后端对齐）。

- [ ] **Step 3: 前端质量门不回退**

```bash
npx vue-tsc --noEmit && npx vitest run 2>&1 | tail -2 && npx vite build 2>&1 | grep 'built in'
```
Expected: 全绿（与恢复基线一致）。

- [ ] **Step 4: 收尾提交**

```bash
cd $SRV && git add -A && git commit -q -m "chore: Phase1 联调修复" || true
cd ../snippet && git add -A && git commit -q -m "chore: Phase1 联调修复（前端侧）" || true
```

---

## Self-Review 记录

- Spec 覆盖：Phase 1 的后端补全/DB/种子/联调四块分别对应 Task 1-4 / 5 / 6 / 7 ✓
- 类型一致：`Example` 字段与前端 `CodeExample` 对齐（snippet 示例源码里 updateExample 的 Partial 传入兼容）✓；`clampPage/clampPageSize` 签名与 service 调用兼容 ✓
- 已知留白（允许）：seed 映射细节依赖 Step 1 探明的 JSON 结构（计划内含探查步骤，非占位）；jwt.guard 宽容模式的 passport 错误名以联调实测为准（验收标准已写死：匿名 200）
- Phase 2/3 不在本计划：各自另出计划（spec 已约束）
