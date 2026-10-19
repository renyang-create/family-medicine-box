#!/usr/bin/env node
/**
 * 环境变量体检：确认 .env.local 填对了，且没有误填高权限密钥。
 * 输出会对密钥做打码，不会把完整 key 打到屏幕上。
 *
 * 用法：npm run check:env
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = resolve(process.cwd(), '.env.local');

if (!existsSync(FILE)) {
  console.error('✗ 没有找到 .env.local');
  console.error('  解决：复制 .env.example 为 .env.local，再填入你的 Supabase 值。');
  process.exit(1);
}

const env = {};
for (const line of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
  const matched = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (!matched) continue;
  env[matched[1]] = matched[2].replace(/^["']|["']$/g, '').trim();
}

function mask(value) {
  if (!value) return '(空)';
  if (value.length <= 14) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const problems = [];

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL 应为 https://<项目名>.supabase.co（不要带斜杠和多余路径）');
}
if (/placeholder/i.test(url)) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL 还是占位值，没换成真实项目地址');
}
if (anonKey.length < 30) {
  problems.push('EXPO_PUBLIC_SUPABASE_ANON_KEY 太短，不像真实 key（可能只粘了一半）');
}
if (/placeholder|replace-with/i.test(anonKey)) {
  problems.push('EXPO_PUBLIC_SUPABASE_ANON_KEY 还是占位值，没换成真实 key');
}
if (/service_role|sb_secret_/i.test(anonKey)) {
  problems.push('你填的像 service role / secret key —— 绝对不能用，请换成 anon public / publishable key');
}

if (problems.length > 0) {
  console.error('✗ .env.local 有问题：\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\n改完保存后重新运行：npm run check:env');
  process.exit(1);
}

console.log('✓ .env.local 格式正确：');
console.log(`  SUPABASE_URL = ${url}`);
console.log(`  ANON_KEY     = ${mask(anonKey)}  （已打码，长度 ${anonKey.length}）`);
console.log('\n下一步：npm start，App 应该停在登录页而不是报错。');
