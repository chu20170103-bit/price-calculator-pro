#!/usr/bin/env node
/**
 * 一鍵檢查環境 + 可選 DB 更新 + 部署（適用於從解決方案報告導入到新專案）
 * 使用：npm run setup:deploy  或  node scripts/setup-and-deploy.mjs
 * 可選：SKIP_DB_PUSH=1 略過 db push；DEPLOY_ONLY=1 只部署不跑 db push
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ghpages from 'gh-pages';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const path = resolve(root, '.env');
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: root, stdio: 'inherit', ...opts });
}

function getRepoAndBase() {
  const out = execSync('git remote get-url origin', { encoding: 'utf8', cwd: root });
  const m = out.trim().match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!m) throw new Error('無法從 git remote 取得 owner/repo');
  const repoName = m[1].split('/')[1];
  return { repo: m[1], basePath: `/${repoName}/` };
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const deployOnly = env.DEPLOY_ONLY === '1' || env.DEPLOY_ONLY === 'true';
  const skipDbPush = env.SKIP_DB_PUSH === '1' || env.SKIP_DB_PUSH === 'true';

  console.log('=== 靜態網站 + Supabase 一鍵檢查與部署 ===\n');

  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    console.error('請在專案根目錄建立 .env，並設定：');
    console.error('  VITE_SUPABASE_URL=你的 Supabase Project URL');
    console.error('  VITE_SUPABASE_ANON_KEY=你的 Supabase anon key');
    console.error('\n可複製 .env.example 並改名為 .env 後填入。');
    process.exit(1);
  }
  console.log('✓ 環境變數已設定');

  if (!deployOnly && !skipDbPush) {
    try {
      console.log('\n可選：套用 Supabase migrations (db push)...');
      run('npm run db:push', { env });
      console.log('✓ db push 完成');
    } catch (e) {
      console.warn('\n⚠ db push 略過或失敗（若尚未 link 請先執行 npx supabase link --project-ref <REF>）');
    }
  }

  const { repo, basePath } = getRepoAndBase();
  console.log('\nRepo:', repo, '| base:', basePath);

  console.log('\n1. 本機建置...');
  run('npm run build', {
    env: { ...process.env, BASE_PATH: basePath, VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key },
  });

  const dist = resolve(root, 'dist');
  writeFileSync(resolve(dist, '.nojekyll'), '');
  const indexHtml = resolve(dist, 'index.html');
  if (existsSync(indexHtml)) {
    writeFileSync(resolve(dist, '404.html'), readFileSync(indexHtml, 'utf8'));
  }

  console.log('\n2. 推送到 gh-pages...');
  await new Promise((resolvePromise, reject) => {
    ghpages.publish(
      dist,
      {
        branch: 'gh-pages',
        repo: `https://github.com/${repo}.git`,
        dotfiles: true,
      },
      (err) => (err ? reject(err) : resolvePromise())
    );
  });

  const [owner, name] = repo.split('/');
  console.log('\n完成。網址：https://' + owner + '.github.io/' + name + '/');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
