#!/usr/bin/env bash
# 代码块（snippet）全栈 → NAS 一键发布（应用代码部分，不含数据迁移）
# 用法：bash snippet/deploy/sync.sh
# 前置：snippet 与 snippet-server 为同级目录；NAS 免密 key ~/.ssh/id_wbnas_algo
# 红线：本脚本不触碰数据库；数据迁移请用 migrate-db.sh（且仅首次）
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$HERE/.." && pwd)"            # .../代码块/snippet
BACKEND_DIR="$(cd "$HERE/../../snippet-server" && pwd)"  # .../代码块/snippet-server

NAS_DIR=/volume1/docker/snippet
KEY=~/.ssh/id_wbnas_algo
NAS_LAN_IP=192.168.1.18
NAS_WAN_IP=106.15.35.71
NAS_WAN_PORT=32266

_pick="${NAS_FORCE:-auto}"
if [ "$_pick" = auto ]; then
  if nc -z -w 3 "$NAS_LAN_IP" 22 >/dev/null 2>&1; then _pick=lan; else _pick=wan; fi
fi
if [ "$_pick" = lan ]; then
  NAS_HOST="zhangzhengyang@$NAS_LAN_IP"; NAS_PORT=22
else
  NAS_HOST="zhangzhengyang@$NAS_WAN_IP"; NAS_PORT=$NAS_WAN_PORT
fi
SSH_OPTS=(-i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p "$NAS_PORT")
SUDO='echo "8kTV!42bwbU2PDH" | sudo -S -p ""'

log() { echo "[sync $(date +%H:%M:%S)] $*"; }

# 0. 本地前端构建（刻意不设置 VITE_API_BASE_URL → 默认相对 /api，由生产 nginx 反代）
if [ "${SKIP_FRONTEND_BUILD:-}" = 1 ]; then
  log "跳过本地前端构建（SKIP_FRONTEND_BUILD=1），使用已有 dist/"
else
  log "本地前端构建（npm run build）…"
  ( cd "$FRONTEND_DIR" && npm run build ) || { echo "❌ 前端构建失败"; exit 1; }
fi

# 1. 远端建目录（/volume1/docker 普通用户无写权，走 sudo 并改属主，后续 tar/cat 才能写入）
log "远端建目录 $NAS_DIR …"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "$SUDO sh -c \"mkdir -p $NAS_DIR/dist $NAS_DIR/server && chown -R zhangzhengyang $NAS_DIR\""

# 2. 上传前端 dist（tar over ssh；DSM 无 SFTP，勿用 scp）
log "上传前端 dist → NAS…"
COPYFILE_DISABLE=1 tar -C "$FRONTEND_DIR" -cf - dist | ssh "${SSH_OPTS[@]}" "$NAS_HOST" "tar -xf - -C $NAS_DIR/"

# 3. 上传后端源码（排除 node_modules/.git/.env/dist）
log "上传后端源码 → NAS（排除 node_modules/.git/.env）…"
tar -czf - -C "$BACKEND_DIR" \
  --exclude ".git" --exclude "node_modules" --exclude "dist" \
  --exclude ".env" --exclude ".env.*" --exclude "coverage" . \
  | ssh "${SSH_OPTS[@]}" "$NAS_HOST" "cd $NAS_DIR/server && tar -xzf -"

# 4. 上传 compose / nginx / .env（600）
log "上传 compose / nginx / .env…"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "cat > $NAS_DIR/docker-compose.yml" < "$HERE/docker-compose.yml"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "cat > $NAS_DIR/nginx-snippet.conf" < "$HERE/nginx-snippet.conf"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "umask 077 && cat > $NAS_DIR/.env" < "$HERE/.env.production"

# 5. NAS 构建后端镜像并起容器
log "NAS docker compose build（DOCKER_BUILDKIT=0）…"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "$SUDO sh -c 'cd $NAS_DIR && DOCKER_BUILDKIT=0 /usr/local/bin/docker compose build 2>&1 | tail -6'"
log "NAS docker compose up -d --force-recreate…"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "$SUDO sh -c 'cd $NAS_DIR && /usr/local/bin/docker compose up -d --force-recreate 2>&1 | tail -6'"

# 6. 显式跑迁移（migrationsRun:false；dump 已含 migrations 表，应为 no-op）
log "容器内跑迁移（幂等）…"
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "$SUDO sh -c 'cd $NAS_DIR && /usr/local/bin/docker compose run --rm backend npx typeorm-ts-node-commonjs -d src/data-source.ts migration:run 2>&1 | tail -8'" || true

# 7. 验证
log "等待启动…"
sleep 20
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "$SUDO /usr/local/bin/docker ps --format '{{.Names}}|{{.Status}}'" 2>/dev/null | grep -E 'snippet' || true
ssh "${SSH_OPTS[@]}" "$NAS_HOST" "curl -s -o /dev/null -w 'NAS 本机探针: %{http_code}\n' http://127.0.0.1:6300/"
log "✅ 应用部署完成。公网验证：https://snippet.zhangzhengyang.com/"
