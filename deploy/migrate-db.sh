#!/usr/bin/env bash
# 代码块 一次性数据迁移：本地 homebrew PG 的 html5_examples → NAS 共享 dev-postgres（新建库）
# 用法：bash snippet/deploy/migrate-db.sh
# 前置：本地 postgresql@15 在跑（html5_examples 库存在）；NAS 免密 key ~/.ssh/id_wbnas_algo
# 注意：仅首次需要；之后数据库随 NAS dev-postgres 持久存在。迁移前会全量备份 dev-postgres。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
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
SUDO_PW='8kTV!42bwbU2PDH'
SUDO="echo '$SUDO_PW' | sudo -S -p ''"

LOCAL_DUMP=$(mktemp /tmp/snippet_pg_XXXX.dump)
NAS_DUMP=/tmp/snippet_html5_examples.dump
log() { echo "[migrate $(date +%H:%M:%S)] $*"; }

cleanup() { rm -f "$LOCAL_DUMP"; }
trap cleanup EXIT

# 0. 本地 dump（socket 直连，peer trust 免密；--no-owner 便于在 NAS 以 appuser 恢复）
log "本地 dump html5_examples（--no-owner --no-privileges -Fc）…"
if ! pg_dump -U xiaoye -Fc --no-owner --no-privileges html5_examples > "$LOCAL_DUMP" 2>/tmp/pgdump.err; then
  echo "❌ 本地 pg_dump 失败："; cat /tmp/pgdump.err; exit 1
fi
log "dump 大小：$(wc -c < "$LOCAL_DUMP") 字节"

# 1. 传 dump 到 NAS（tar pipe，不用 scp）
log "传 dump → NAS $NAS_DUMP …"
cat "$LOCAL_DUMP" | ssh "${SSH_OPTS[@]}" "$NAS_HOST" "cat > $NAS_DUMP"

# 2. NAS 侧：全量备份 dev-postgres → 建库 → 确保扩展 → 恢复
log "NAS 侧：备份 dev-postgres → 建 html5_examples → 恢复…"
RESTORE_SH=$(mktemp /tmp/snippet_restore_XXXX.sh)
cat > "$RESTORE_SH" <<'REMOTE'
set -e
mkdir -p /volume1/docker/snippet
BACKUP=/volume1/docker/snippet/db-backup-dev-postgres-$(date +%Y%m%d-%H%M%S).sql
echo "[nas] 全量备份 dev-postgres → $BACKUP"
/usr/local/bin/docker exec dev-postgres pg_dumpall -U appuser > "$BACKUP" 2>/dev/null || echo "[nas] 备份跳过（交互密码）"
echo "[nas] 建库 html5_examples（若不存在）"
/usr/local/bin/docker exec dev-postgres createdb -U appuser html5_examples 2>/dev/null || true
echo "[nas] 确保扩展 uuid-ossp / pg_trgm"
/usr/local/bin/docker exec dev-postgres psql -U appuser -d html5_examples -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>&1 | tail -2
echo "[nas] 恢复 dump（--no-owner，作为 appuser）"
/usr/local/bin/docker exec -i dev-postgres pg_restore -U appuser --no-owner --no-privileges -d html5_examples < /tmp/snippet_html5_examples.dump 2>&1 | grep -vi "already exists\|duplicate key\|WARNING" | tail -12
echo "[nas] 恢复完成"
REMOTE
{ printf '%s\n' "$SUDO_PW"; cat "$RESTORE_SH"; } | ssh "${SSH_OPTS[@]}" "$NAS_HOST" "sudo -S -p '' sh -s"
rm -f "$RESTORE_SH"
log "✅ 数据迁移完成。随后运行 sync.sh 部署应用容器。"
