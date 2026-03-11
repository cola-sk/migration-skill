/**
 * diffParser.js
 * 将 GitLab 返回的 unified diff 解析成结构化的 hunk 列表，
 * 方便后续 AI 分析和规则提取。
 */

/**
 * 解析单个文件的 diff 文本，返回 hunk 数组。
 * 每个 hunk：{ header, removed: string[], added: string[], context: string[] }
 */
export function parseHunks(diffText) {
  if (!diffText) return [];
  const hunks  = [];
  let   current = null;

  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { header: raw, removed: [], added: [], context: [] };
      continue;
    }
    if (!current) continue;

    if (raw.startsWith('-'))      current.removed.push(raw.slice(1));
    else if (raw.startsWith('+')) current.added.push(raw.slice(1));
    else                          current.context.push(raw.slice(1));
  }
  if (current) hunks.push(current);
  return hunks;
}

/**
 * 解析整批 diff（fetchMRDiffs 的返回值），
 * 只保留有实质内容的文件，过滤纯二进制 / 空 diff。
 */
export function parseDiffs(rawDiffs) {
  return rawDiffs
    .filter(f => f.diff && f.diff.trim())
    .map(f => ({
      oldPath:   f.oldPath,
      newPath:   f.newPath,
      isNew:     f.isNew,
      isDeleted: f.isDeleted,
      isRenamed: f.isRenamed,
      hunks:     parseHunks(f.diff),
      // 便于 AI 阅读的纯文本摘要
      summary:   buildFileSummary(f),
    }));
}

/** 生成便于 AI 理解的简短描述 */
function buildFileSummary(f) {
  const lines = f.diff.split('\n');
  const added   = lines.filter(l => l.startsWith('+')).length;
  const removed = lines.filter(l => l.startsWith('-')).length;
  return `${f.newPath}：+${added} -${removed} 行` +
    (f.isNew ? ' [新文件]' : '') +
    (f.isDeleted ? ' [已删除]' : '') +
    (f.isRenamed ? ` [重命名自 ${f.oldPath}]` : '');
}

/**
 * 把解析结果序列化为供 AI 阅读的紧凑文本块。
 * 控制长度：每个文件最多取前 N 个 hunk，避免超出 token 限制。
 */
export function diffToPromptText(parsedDiffs, { maxHunksPerFile = 6, maxFiles = 20 } = {}) {
  return parsedDiffs
    .slice(0, maxFiles)
    .map(f => {
      const hunkText = f.hunks.slice(0, maxHunksPerFile).map(h => [
        `  ${h.header}`,
        ...h.removed.map(l => `  - ${l}`),
        ...h.added.map(l =>   `  + ${l}`),
      ].join('\n')).join('\n');
      return `### ${f.newPath}\n${hunkText}`;
    })
    .join('\n\n');
}