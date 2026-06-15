// 本地测试：对 fixtur.es 样本 /tmp/fix.ics 跑 transform（中文 + football-data 补比分逻辑）。
import { readFileSync } from "node:fs";
import { transform } from "./build.mjs";

const src = readFileSync("/tmp/fix.ics", "utf8");
const { ics, starred, events } = transform(src, null);   // 仅 fixtur.es

const srcEvents = (src.match(/BEGIN:VEVENT/g) || []).length;
const begins = (ics.match(/BEGIN:VEVENT/g) || []).length;
const ends = (ics.match(/END:VEVENT/g) || []).length;

let pass = 0, fail = 0;
const check = (n, c) => { console.log((c ? "  ✓ " : "  ✗ ") + n); c ? pass++ : fail++; };

console.log("【事件完整性】");
check(`输出事件数=输入=${srcEvents}（应 104）`, events === srcEvents && events === 104);
check("BEGIN/END VEVENT 配对", begins === ends && begins === events);
check("VCALENDAR 头尾完整", ics.includes("BEGIN:VCALENDAR") && ics.trimEnd().endsWith("END:VCALENDAR"));

console.log("【关注队高亮】");
check(`⭐ 标记 15 场，实际 ${starred}`, starred === 15);
for (const t of ["法国", "英格兰", "巴西", "阿根廷", "葡萄牙"])
  check(`${t} 至少一场带 ⭐`, new RegExp(`SUMMARY:⭐ [^\\r\\n]*${t}`).test(ics));

console.log("【中文化】");
check("队名中文（巴西/法国/墨西哥）", ics.includes("巴西") && ics.includes("法国") && ics.includes("墨西哥"));
check("轮次中文（32强/16强/半决赛）", ics.includes("32强") && ics.includes("16强") && ics.includes("半决赛"));
check("占位中文（组第/胜者）", ics.includes("组第") && ics.includes("胜者"));
check("无英文队名残留", !/SUMMARY:[^\r\n]*(Brazil|France|Mexico|England|Round of)/.test(ics));

console.log("【football-data 补比分】");
// 模拟 football-data 索引：荷兰 2-2 日本（fixtur.es 该场当前无比分）
const mockIdx = new Map([["Japan|Netherlands", { home: "Netherlands", away: "Japan", fh: 2, fa: 2 }]]);
const { ics: ics2 } = transform(src, mockIdx);
check("补比分后 荷兰 - 日本 (2-2)", /SUMMARY:荷兰 - 日本 \(2-2\)/.test(ics2));
check("未匹配场不受影响（墨西哥 - 南非 仍在）", /SUMMARY:墨西哥 - 南非/.test(ics2));
check("淘汰赛占位不被误加比分（无 胜者N (x-y)）", !/胜者\d+ \(\d+-\d+\)/.test(ics2));

console.log("【数据保真】");
check("非关注队不误标（墨西哥 - 南非 无 ⭐）", /SUMMARY:墨西哥 - 南非/.test(ics));
check("时间字段保留（DTSTART UTC）", ics.includes("DTSTART:20260611T190000Z"));
check("不重复加星", !ics.includes("⭐ ⭐"));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
