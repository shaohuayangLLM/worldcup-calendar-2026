// 本地测试：对已下载的 fixtur.es 样本 /tmp/fix.ics 跑 transform，校验正确性。
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
for (const t of ["France", "England", "Brazil", "Argentina", "Portugal"]) {
  check(`${t} 至少一场带 ⭐`, new RegExp(`SUMMARY:⭐ [^\\r\\n]*${t}`).test(ics));
}

console.log("【数据保真】");
check("已完赛比分括号保留 (2-0)", ics.includes("(2-0)"));
check("非关注队不误标（Mexico - South Africa 无 ⭐）", /SUMMARY:Mexico - South Africa/.test(ics));
check("日历名已改为可识别名", ics.includes("X-WR-CALNAME:2026 世界杯"));
check("时间字段保留（DTSTART UTC）", ics.includes("DTSTART:20260611T190000Z"));
check("不重复加星（无 ⭐ ⭐）", !ics.includes("⭐ ⭐"));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
