#!/usr/bin/env node
/**
 * 依「當前專案」自動判斷：專案命名、資料庫表/欄位、env，寫入 supabase-sync.config.json。
 * 不帶入其他專案設計：表名與欄位名一律來自本專案 migrations / 程式碼或本專案 prefix。
 * 使用：npm run supabase:detect
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function toSnakeCase(s) {
  return s
    .replace(/-/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase() || 'app';
}

/** 從 package.json 或 git 或 cwd 取得專案名，轉成 DB 用 prefix（共同資料庫子目錄用） */
function getProjectPrefix() {
  try {
    const pkgPath = resolve(root, 'package.json');
    if (existsSync(pkgPath)) {
      const name = JSON.parse(readFileSync(pkgPath, 'utf8')).name;
      if (name && typeof name === 'string') return toSnakeCase(name);
    }
  } catch (_) {}
  try {
    const out = execSync('git remote get-url origin', { encoding: 'utf8', cwd: root });
    const m = out.trim().match(/([^/]+?)(?:\.git)?$/);
    if (m) return toSnakeCase(m[1]);
  } catch (_) {}
  return toSnakeCase(basename(root)) || 'app';
}

function loadEnv() {
  const p = resolve(root, '.env');
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function* walkFiles(dir, ext) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, name.name);
    if (name.isDirectory() && !['node_modules', '.git'].includes(name.name)) {
      yield* walkFiles(full, ext);
    } else if (name.isFile() && (!ext || name.name.endsWith(ext))) {
      yield full;
    }
  }
}

/** 從 SQL 解析 create table 名稱與欄位 [ { name, type } ] */
function parseMigrationsTables(migrationsDir) {
  const tables = {};
  if (!existsSync(migrationsDir)) return tables;
  for (const file of walkFiles(migrationsDir, '.sql')) {
    const content = readFileSync(file, 'utf8');
    const createRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
    let m;
    while ((m = createRegex.exec(content)) !== null) {
      const tableName = m[1].toLowerCase();
      const defs = m[2].split(',').map((line) => {
        const parts = line.trim().split(/\s+/);
        const colName = parts[0].toLowerCase().replace(/^["']|["']$/g, '');
        const type = (parts[1] || '').toLowerCase();
        return { name: colName, type };
      });
      if (!tables[tableName]) tables[tableName] = [];
      tables[tableName].push(...defs);
    }
  }
  return tables;
}

/** 從程式碼取得 .from('x').select('a,b') 或 .insert({...}) 的欄位 */
function parseCodeTables(srcDir) {
  const tableColumns = {};
  if (!existsSync(srcDir)) return tableColumns;
  for (const file of [...walkFiles(srcDir, '.ts'), ...walkFiles(srcDir, '.tsx')]) {
    const content = readFileSync(file, 'utf8');
    const fromMatch = content.matchAll(/\.from\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const fm of fromMatch) {
      const t = fm[1].toLowerCase();
      if (!tableColumns[t]) tableColumns[t] = new Set();
    }
    const selectMatch = content.matchAll(/\.select\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const sm of selectMatch) {
      const prev = content.slice(0, sm.index).split(/\.from\s*\(/).pop();
      const tableMatch = prev.match(/['"]([^'"]+)['"]\s*\)/);
      if (tableMatch) {
        const t = tableMatch[1].toLowerCase();
        if (!tableColumns[t]) tableColumns[t] = new Set();
        sm[1].split(',').forEach((c) => tableColumns[t].add(c.trim().toLowerCase()));
      }
    }
    const insertMatch = content.matchAll(/\.insert\s*\(\s*\{([^}]+)\}/g);
    for (const im of insertMatch) {
      const prev = content.slice(0, im.index).split(/\.from\s*\(/).pop();
      const tableMatch = prev.match(/['"]([^'"]+)['"]\s*\)/);
      if (tableMatch) {
        const t = tableMatch[1].toLowerCase();
        if (!tableColumns[t]) tableColumns[t] = new Set();
        im[1].replace(/\[([^\]]+)\]/g, (_, k) => k).split(',').forEach((pair) => {
          const col = pair.split(':')[0].trim().replace(/["'\s]/g, '');
          if (col) tableColumns[t].add(col.toLowerCase());
        });
      }
    }
  }
  const result = {};
  for (const [t, set] of Object.entries(tableColumns)) {
    result[t] = [...set];
  }
  return result;
}

/** 依欄位名與型別推斷：主表（一裝置一筆）vs 清單表（多筆），並回傳建議的 config 欄位名 */
function inferTableRoles(migrationsTables, codeTables) {
  const allTables = new Set([
    ...Object.keys(migrationsTables),
    ...Object.keys(codeTables),
  ]);
  const tablesWithCols = {};
  for (const t of allTables) {
    const fromMig = (migrationsTables[t] || []).map((c) => ({ name: c.name, type: c.type }));
    const fromCode = (codeTables[t] || []).map((c) => ({ name: c, type: '' }));
    const combined = [];
    const seen = new Set();
    for (const c of fromMig) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        combined.push(c);
      }
    }
    for (const c of fromCode) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        combined.push({ name: c.name, type: '' });
      }
    }
    tablesWithCols[t] = combined;
  }

  let mainTable = null;
  let listTable = null;
  const cols = (t) => (tablesWithCols[t] || []).map((c) => c.name);
  const hasCol = (t, name) => cols(t).some((c) => c === name || c.includes(name));
  const getFirstJsonb = (t) => (tablesWithCols[t] || []).find((c) => c.type === 'jsonb');
  const getCol = (t, ...candidates) => (tablesWithCols[t] || []).find((c) => candidates.includes(c.name))?.name;

  for (const t of allTables) {
    const c = cols(t);
    const hasDeviceId = c.some((x) => x === 'device_id');
    const hasUpdated = c.some((x) => x === 'updated_at');
    const hasCreated = c.some((x) => x === 'created_at');
    const hasJsonb = (tablesWithCols[t] || []).some((x) => x.type === 'jsonb');
    const hasItemId = c.some((x) => /profile_id|item_id|entry_id/.test(x));
    const hasName = c.some((x) => x === 'name');
    const hasRows = c.some((x) => x === 'rows' || x === 'data');
    if (hasDeviceId && (hasUpdated || hasJsonb) && !hasItemId && !mainTable) {
      mainTable = t;
    } else if (hasDeviceId && (hasItemId || hasName) && (hasRows || hasJsonb) && !listTable) {
      listTable = t;
    }
  }

  return {
    mainTable: mainTable || null,
    listTable: listTable || null,
    tablesWithCols,
    inferMainColumns(tableName) {
      const c = tablesWithCols[tableName] || [];
      const names = c.map((x) => x.name);
      const jsonbCol = c.find((x) => x.type === 'jsonb');
      return {
        deviceIdColumn: names.find((x) => x === 'device_id') || 'device_id',
        payloadColumnGames: jsonbCol ? jsonbCol.name : (names.find((x) => x === 'games') || 'data'),
        payloadColumnCurrentId: names.find((x) => /current_.*_id|current_id/.test(x)) || names.find((x) => x === 'current_game_id') || 'current_id',
        updatedAtColumn: names.find((x) => x === 'updated_at') || 'updated_at',
      };
    },
    inferListColumns(tableName) {
      const c = tablesWithCols[tableName] || [];
      const names = c.map((x) => x.name);
      return {
        deviceIdColumn: names.find((x) => x === 'device_id') || 'device_id',
        itemIdColumn: names.find((x) => /profile_id|item_id|entry_id/.test(x)) || 'item_id',
        nameColumn: names.find((x) => x === 'name') || 'name',
        dataColumn: names.find((x) => x === 'rows' || x === 'data') || 'data',
        createdAtColumn: names.find((x) => x === 'created_at') || 'created_at',
      };
    },
  };
}

function main() {
  try {
    console.log('=== 依當前專案判斷 Supabase 命名（無其他專案設計）===\n');

    const projectPrefix = getProjectPrefix();
    console.log('專案 prefix（共同 DB 子目錄用）:', projectPrefix);

    const env = loadEnv();
    const urlKey = Object.keys(env).find((k) => /VITE_SUPABASE_URL|SUPABASE_URL/i.test(k)) || 'VITE_SUPABASE_URL';
    const anonKey = Object.keys(env).find((k) => /VITE_SUPABASE_ANON|SUPABASE_ANON/i.test(k)) || 'VITE_SUPABASE_ANON_KEY';

    const migrationsDir = resolve(root, 'supabase/migrations');
    const srcDir = resolve(root, 'src');
    const migrationsTables = parseMigrationsTables(migrationsDir);
    const codeTables = parseCodeTables(srcDir);

    const { mainTable, listTable, tablesWithCols, inferMainColumns, inferListColumns } = inferTableRoles(
      migrationsTables,
      codeTables
    );

    const tableList = Object.keys(tablesWithCols).filter((t) => !/^vite|^import/.test(t)).sort();
    let mainName = mainTable;
    let listName = listTable;
    if (!mainName && tableList.length >= 1) mainName = tableList[0];
    if (!listName && tableList.length >= 2) listName = tableList[1];
    if (!mainName) mainName = `${projectPrefix}_sync`;
    if (!listName) listName = `${projectPrefix}_items`;

    const mainCols = mainName && tablesWithCols[mainName] ? inferMainColumns(mainName) : {
      deviceIdColumn: 'device_id',
      payloadColumnGames: 'data',
      payloadColumnCurrentId: 'current_id',
      updatedAtColumn: 'updated_at',
    };
    const listCols = listName && tablesWithCols[listName] ? inferListColumns(listName) : {
      deviceIdColumn: 'device_id',
      itemIdColumn: 'item_id',
      nameColumn: 'name',
      dataColumn: 'data',
      createdAtColumn: 'created_at',
    };

    const config = {
      description: `依本專案（${projectPrefix}）判斷，表名與欄位名皆來自本專案 migrations/程式碼或 prefix。`,
      projectPrefix,
      mainTable: { name: mainName, ...mainCols },
      listTable: { name: listName, ...listCols },
      env: { urlKey, anonKey },
    };

    const configPath = resolve(root, 'supabase-sync.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('\n已寫入 supabase-sync.config.json');
    console.log('  主表:', mainName, '| 清單表:', listName);
    console.log('請執行：npm run supabase:generate-config');
    return 0;
  } catch (err) {
    console.error('[supabase:detect] 錯誤:', err.message || err);
    process.exit(1);
  }
}

main();
