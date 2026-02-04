#!/usr/bin/env node
/**
 * 靜態網頁 + Supabase：本機建置後推 dist 到 gh-pages，不需 CI。
 * 使用：npm run deploy
 * 條件：專案根目錄 .env 有 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
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
  console.log('=== 靜態網頁 + Supabase 部署 ===\n');

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || '';
  const key = env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    console.error('請在專案根目錄建立 .env，並設定：');
    console.error('  VITE_SUPABASE_URL=你的 Supabase URL');
    console.error('  VITE_SUPABASE_ANON_KEY=你的 Supabase anon key');
    process.exit(1);
  }

  const { repo, basePath } = getRepoAndBase();
  console.log('Repo:', repo, '| base:', basePath);

  console.log('\n1. 本機建置（含 Supabase 連線）...');
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
