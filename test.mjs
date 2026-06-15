// 本地测试：对已下载的 fixtur.es 样本 /tmp/fix.ics 跑 transform，校验正确性（中文版）。
import { readFileSync } from "node:fs";
import { transform } from "./build.mjs";

const src = readFileSync("/tmp/fix.ics", "utf8");
const { ics, starred, events } = transform(src);

const srcEvents = (src.match(/BEGIN:VEVENT/g) || []).length;
const begins = (ics.match(/BEGIN:VEVENT/g) || []).length;
const ends = (ics.match(/END:VEVENT/g) || []).length;

let pass = 0, fail = 0;
const check = (name, cond) => {
  console.log((cond ? "  ✓ " : "  ✗ ") + name);
  cond ? pass++ : fail++;
};

console.log("【事件完整性】");
check(`输出事件数=输入=${srcEvents}（应 104）`, events === srcEvents && events === 104);
check("BEGIN/END VEVENT 配对", begins === ends && begins === events);
check("VCALENDAR 头尾完整", ics.includes("BEGIN:VCALENDAR") && ics.trimEnd().endsWith("END:VCALENDAR"));

console.log("【关注队高亮】");
check(`⭐ 标记 15 场（5 队×3 小组赛），实际 ${starred}`, starred === 15);
for (const t of ["法国", "英格兰", "巴西", "阿根廷", "葡萄牙"]) {
  check(`${t} 至少一场带 ⭐`, new RegExp(`SUMMARY:⭐ [^\\r\\n]*${t}`).test(ics));
}

console.log("【中文化】");
check("队名中文（含 巴西/法国/墨西哥）", ics.includes("巴西") && ics.includes("法国") && ics.includes("墨西哥"));
check("轮次中文（32强 / 16强 / 1/4决赛 / 半决赛）", ics.includes("32强") && ics.includes("16强") && ics.includes("半决赛"));
check("占位中文（组第 / 胜者）", ics.includes("组第") && ics.includes("胜者"));
check("无英文队名残留在 SUMMARY", !/SUMMARY:[^\r\n]*(Brazil|France|Mexico|England|Round of)/.test(ics));

console.log("【数据保真】");
check("已完赛比分括号保留 (2-0)", ics.includes("(2-0)"));
check("非关注队不误标（墨西哥 - 南非 无 ⭐）", /SUMMARY:墨西哥 - 南非/.test(ics));
check("时间字段保留（DTSTART UTC）", ics.includes("DTSTART:20260611T190000Z"));
check("不重复加星（无 ⭐ ⭐）", !ics.includes("⭐ ⭐"));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
