#!/usr/bin/env node
/**
 * 密钥闸门：提交前跑 `npm run check:secrets`。
 * 目标：拦住「把服务端密钥写进前端代码」这类最贵的事故。
 *
 * 只扫描会被打进 bundle 的代码与配置，不扫描 node_modules / 文档。
 * 命中即 exit 1，并打印 文件:行号。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TARGETS = ['src', 'scripts', 'app.config.ts', '.env.example'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'coverage', 'assets']);
const SKIP_FILES = new Set(['scripts/check-secrets.mjs']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ttf', '.otf', '.ico', '.mp4']);

const RULES = [
  {
    name: 'Supabase service role 密钥赋值',
    re: /service_role\s*[:=]\s*['"][A-Za-z0-9._-]{20,}/i,
  },
  {
    name: 'AI 供应商密钥赋值',
    re: /(AI_API_KEY|OPENAI_API_KEY|DEEPSEEK_API_KEY|ZHIPU_API_KEY|DASHSCOPE_API_KEY|SILICONFLOW_API_KEY)\s*[:=]\s*['"][^'"]{8,}/,
  },
  { name: 'sk- 形式的密钥字面量', re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  {
    name: 'JWT 字面量（可能是新密钥）',
    re: /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/,
  },
];

const findings = [];
let scanned = 0;

function shouldSkipFile(relPath) {
  if (SKIP_FILES.has(relPath)) return true;
  const dot = relPath.lastIndexOf('.');
  const ext = dot === -1 ? '' : relPath.slice(dot).toLowerCase();
  return SKIP_EXT.has(ext);
}

function scanFile(absPath, relPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return;
  }
  scanned += 1;
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        findings.push({ file: relPath, line: index + 1, rule: rule.name, snippet: line.trim().slice(0, 120) });
      }
    }
  });
}

function walk(absPath, relPath) {
  let stats;
  try {
    stats = statSync(absPath);
  } catch {
    return;
  }

  if (stats.isDirectory()) {
    if (SKIP_DIRS.has(absPath.split(/[\\/]/).pop())) return;
    for (const entry of readdirSync(absPath)) {
      const childAbs = join(absPath, entry);
      const childRel = relPath ? `${relPath}/${entry}` : entry;
      walk(childAbs, childRel);
    }
    return;
  }

  if (shouldSkipFile(relPath)) return;
  scanFile(absPath, relPath);
}

for (const target of TARGETS) {
  const abs = join(ROOT, target);
  walk(abs, target);
}

if (findings.length > 0) {
  console.error(`\n[check:secrets] 发现 ${findings.length} 处疑似密钥泄漏：\n`);
  for (const f of findings) {
    console.error(`  ✗ ${f.file}:${f.line}  [${f.rule}]`);
    console.error(`      ${f.snippet}\n`);
  }
  console.error('密钥只允许存在于 Supabase Edge Function secrets / EAS secrets，请立即移除。');
  process.exit(1);
}

console.log(`[check:secrets] 通过：扫描 ${scanned} 个文件，未发现密钥泄漏。`);
