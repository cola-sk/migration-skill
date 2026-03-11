/**
 * Migration Skill — 主流程
 *
 * 流程：
 *   1. 从 GitLab 拉取参考 MR 的 diff
 *   2. 解析 diff，结构化为变更规则
 *   3. 用 Claude API 分析规则，生成迁移策略（skill）
 *   4. 把 skill 应用到目标项目的源文件
 *   5. 输出变更后的文件 / 生成新 MR
 *
 * 用法：
 *   node index.js \
 *     --ref-project "group/ref-repo" \
 *     --ref-mr 42 \
 *     --target-project "group/target-repo" \
 *     --skill-output ./skills/my-migration.json
 */

import 'dotenv/config';
import { fetchMRDiffs } from './gitlab.js';
import { parseDiffs }    from './diffParser.js';
import { buildSkill }    from './skillBuilder.js';
// import { applySkill }    from './skillApplier.js';
// import { createMR }      from './gitlab.js';
import { parseArgs }     from './utils.js';

async function main() {
  const args = parseArgs();

  console.log('📥 Step 1: 拉取参考 MR diff ...');
  const rawDiffs = await fetchMRDiffs(args.refProject, args.refMr);

  console.log('🔍 Step 2: 解析 diff 结构 ...');
  const parsedDiff = parseDiffs(rawDiffs);

  console.log('🤖 Step 3: AI 分析，生成迁移 Skill ...');
  const skill = await buildSkill(parsedDiff, args.skillOutput);
  console.log(`   ✅ Skill 已保存至 ${args.skillOutput}`);

//   console.log('⚙️  Step 4: 将 Skill 应用到目标项目 ...');
//   const changes = await applySkill(skill, args.targetProject);
//   console.log(`   ✅ 共修改 ${changes.length} 个文件`);

//   if (args.createMr) {
//     console.log('🚀 Step 5: 提交 MR ...');
//     const mrUrl = await createMR(args.targetProject, changes, skill.summary);
//     console.log(`   ✅ MR 已创建: ${mrUrl}`);
//   }
}

main().catch(e => { console.error(e); process.exit(1); });