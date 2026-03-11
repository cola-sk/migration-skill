/**
 * skillBuilder.js
 * 从 diff 中生成可复用的 AI Agent Migration Skill（.prompt.md 格式）
 */

import fs                        from 'fs/promises';
import path                      from 'path';
import { diffToPromptText }      from './diffParser.js';

export async function buildSkill(parsedDiffs, outputPath) {
  const diffText = diffToPromptText(parsedDiffs);

  const content = `---
mode: agent
description: "代码迁移 Skill：根据参考 diff，将结构相似的工程迁移到新版本"
---

# 代码迁移任务

你是一位代码迁移专家。你的任务是参照下方提供的 **参考 diff**，对当前工程执行相同的代码迁移。

参考 diff 来自一个已完成迁移的工程，当前工程与其具有相似的代码结构和技术栈。你需要理解每处改动的**迁移意图**，并将相同的模式应用到当前工程。

---

## 迁移原则

- **理解意图，而非照搬**：分析每处 diff 背后的目的（如 API 升级、依赖替换、架构调整），再应用到当前工程
- **结构映射**：当前工程的文件结构可能与参考工程略有不同，根据功能相似性找到对应文件
- **保持一致性**：同类改动在所有文件中统一应用，避免遗漏
- **不破坏现有逻辑**：只改动与迁移相关的部分，不引入额外重构

---

## 迁移步骤

1. **解读 diff**：逐文件阅读参考 diff，归纳每类改动的迁移模式（API 替换 / import 变更 / 配置调整 / 逻辑重构等）
2. **扫描工程**：在当前工程中定位与参考工程功能对应的文件
3. **逐模式应用**：按照归纳出的迁移模式，依次修改对应文件
4. **兜底处理**：对参考工程中存在但当前工程缺失的文件，判断是否需要新建或跳过
5. **自检**：确认所有改动与参考 diff 的迁移意图一致，无遗漏

---

## 参考 Diff

> 以下是参考工程的完整迁移 diff，请以此为唯一依据完成迁移：

\`\`\`diff
${diffText}
\`\`\`
`;

  const finalPath = outputPath
    ? (path.extname(outputPath) ? outputPath : outputPath + '.prompt.md')
    : './skills/migration.prompt.md';

  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await fs.writeFile(finalPath, content, 'utf-8');

  return content;
}

/** 从文件加载已有 skill */
export async function loadSkill(skillPath) {
  return fs.readFile(skillPath, 'utf-8');
}
