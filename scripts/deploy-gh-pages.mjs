#!/usr/bin/env node
/**
 * 一鍵部署：把 GitHub Pages 來源設為 gh-pages、觸發 workflow，並可等待完成。
 * 需要已安裝並登入 gh (brew install gh && gh auth login)。
 * 使用：node scripts/deploy-gh-pages.mjs [--wait]
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const wait = process.argv.includes('--wait');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: root, ...opts });
  } catch (e) {
    if (e.stderr) process.stderr.write(e.stderr);
    throw e;
  }
}

function getRepo() {
  const out = run('git remote get-url origin');
  const m = out.trim().match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!m) throw new Error('無法從 git remote 取得 owner/repo');
  return m[1];
}

async function main() {
  console.log('=== 一鍵部署 GitHub Pages ===\n');
  const repo = getRepo();
  const [owner, repoName] = repo.split('/');
  console.log('Repo:', repo);

  // 1. 設定 Pages 來源為 gh-pages
  console.log('\n1. 設定 Pages 來源為 gh-pages...');
  const body = JSON.stringify({ build_type: 'legacy', source: { branch: 'gh-pages', path: '/' } });
  run(`gh api repos/${repo}/pages -X PUT --input -`, { input: body });
  console.log('   OK');

  // 2. 觸發 workflow
  console.log('\n2. 觸發 Deploy to GitHub Pages...');
  run('gh workflow run "deploy-gh-pages.yml"');
  console.log('   OK');

  if (wait) {
    console.log('\n3. 等待執行完成（約 1～2 分鐘）...');
    run('gh run watch --exit-status', { stdio: 'inherit' });
    console.log('\n部署完成。網址：https://' + owner + '.github.io/' + repoName + '/');
  } else {
    console.log('\n到 Actions 查看進度：https://github.com/' + repo + '/actions');
    console.log('完成後網址：https://' + owner + '.github.io/' + repoName + '/');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
