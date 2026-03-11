/**
 * gitlab.js — GitLab REST API 封装
 * 环境变量：
 *   GITLAB_URL    GitLab 地址，默认 https://gitlab.com
 *   GITLAB_TOKEN  Personal Access Token（api scope）
 */

const BASE   = process.env.GITLAB_URL   || 'https://gitlab.com';
const TOKEN  = process.env.GITLAB_TOKEN || '';
const HEADS  = { 'PRIVATE-TOKEN': TOKEN, 'Content-Type': 'application/json' };

const enc = id => encodeURIComponent(id);

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}/api/v4${path}`, { headers: HEADS, ...opts });
  if (!res.ok) throw new Error(`GitLab API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── 分页拉取全部结果 ──────────────────────────────────────────────────────────
async function fetchAll(path, params = {}) {
  const qs = new URLSearchParams({ per_page: 100, ...params });
  let   url = `${BASE}/api/v4${path}?${qs}`;
  const all = [];
  while (url) {
    const res  = await fetch(url, { headers: HEADS });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const page = await res.json();
    all.push(...page);
    url = res.headers.get('x-next-page')
      ? `${BASE}/api/v4${path}?${new URLSearchParams({ ...params, per_page: 100, page: res.headers.get('x-next-page') })}`
      : null;
  }
  return all;
}

// ── 拉取 MR 的所有文件 diff ───────────────────────────────────────────────────
export async function fetchMRDiffs(projectId, mrIid) {
  const items = await fetchAll(`/projects/${enc(projectId)}/merge_requests/${mrIid}/diffs`);
  return items.map(f => ({
    oldPath:     f.old_path,
    newPath:     f.new_path,
    diff:        f.diff,          // unified diff 原文
    isNew:       f.new_file,
    isDeleted:   f.deleted_file,
    isRenamed:   f.renamed_file,
  }));
}

// ── 拉取目标项目的文件内容 ────────────────────────────────────────────────────
export async function fetchFileContent(projectId, filePath, ref = 'main') {
  const data = await apiFetch(
    `/projects/${enc(projectId)}/repository/files/${enc(filePath)}?ref=${ref}`
  );
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

// ── 列出目标项目所有源文件（可按扩展名过滤）───────────────────────────────────
export async function listFiles(projectId, { ref = 'main', exts = ['.js', '.ts', '.vue'] } = {}) {
  const tree = await fetchAll(`/projects/${enc(projectId)}/repository/tree`, {
    ref, recursive: true, per_page: 100,
  });
  return tree
    .filter(f => f.type === 'blob' && exts.some(e => f.path.endsWith(e)))
    .map(f => f.path);
}

// ── 创建 / 推送 MR（先创建 branch，再提交文件，再开 MR）─────────────────────
export async function createMR(projectId, changes, summary) {
  const branch = `migration/auto-${Date.now()}`;
  const project = await apiFetch(`/projects/${enc(projectId)}`);
  const defaultBranch = project.default_branch;

  // 1. 创建分支
  await apiFetch(`/projects/${enc(projectId)}/repository/branches`, {
    method: 'POST',
    body: JSON.stringify({ branch, ref: defaultBranch }),
  });

  // 2. 提交每个变更文件
  const actions = changes.map(c => ({
    action:        'update',
    file_path:     c.filePath,
    content:       c.newContent,
    encoding:      'text',
  }));
  await apiFetch(`/projects/${enc(projectId)}/repository/commits`, {
    method: 'POST',
    body: JSON.stringify({
      branch,
      commit_message: `chore: auto migration — ${summary.slice(0, 72)}`,
      actions,
    }),
  });

  // 3. 开 MR
  const mr = await apiFetch(`/projects/${enc(projectId)}/merge_requests`, {
    method: 'POST',
    body: JSON.stringify({
      source_branch:        branch,
      target_branch:        defaultBranch,
      title:                `[Auto Migration] ${summary.slice(0, 72)}`,
      description:          `由 migration-skill 自动生成。\n\n${summary}`,
      remove_source_branch: true,
    }),
  });
  return mr.web_url;
}