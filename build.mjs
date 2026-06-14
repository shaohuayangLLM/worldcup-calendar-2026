#!/usr/bin/env node
// 2026 世界杯日历构建脚本
// 拉取 fixtur.es 的世界杯 .ics（赛程+比分+淘汰赛占位），
// 给关注球队（法/英/巴/阿/葡）的比赛标题加 ⭐ 前缀，改日历名，输出 worldcup.ics。
// 在 GitHub Actions runner 上定时运行（直连 fixtur.es，无需代理）。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://ics.fixtur.es/v2/league/fifa-world-cup-2026.ics";
// 关注球队（fixtur.es 使用的英文队名）。淘汰赛对阵确定后 fixtur.es 会填真名，
// 届时自动命中加 ⭐；占位期（"W14 vs W16"）不含真名，不会误标。
const FAV = ["France", "England", "Brazil", "Argentina", "Portugal"];
const STAR = "⭐ ";
const CAL_NAME = "2026 世界杯 ⭐ 法英巴阿葡";
const CAL_DESC = "2026 FIFA World Cup · 关注队(法/英/巴/阿/葡)加⭐高亮 · 比分与淘汰赛对阵自动更新 · 数据源 fixtur.es";

// 纯函数：输入原始 .ics 文本，输出 { ics, starred, events }
export function transform(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let starred = 0;
  for (let line of lines) {
    if (line.startsWith("SUMMARY:")) {
      const title = line.slice("SUMMARY:".length);
      if (!title.startsWith(STAR) && FAV.some((t) => title.includes(t))) {
        line = "SUMMARY:" + STAR + title;
        starred++;
      }
    } else if (line.startsWith("X-WR-CALNAME:")) {
      line = "X-WR-CALNAME:" + CAL_NAME;
    } else if (line.startsWith("X-WR-CALDESC:")) {
      line = "X-WR-CALDESC:" + CAL_DESC;
    }
    out.push(line);
  }
  const ics = out.join("\r\n");
  const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
  return { ics, starred, events };
}

async function main() {
  const res = await fetch(SOURCE, { headers: { "User-Agent": "worldcup-cal-builder" } });
  if (!res.ok) {
    console.error("fetch fixtur.es failed:", res.status);
    process.exit(1);
  }
  const { ics, starred, events } = transform(await res.text());
  if (events < 100) {
    console.error("sanity check failed: only", events, "events");
    process.exit(1);
  }
  writeFileSync("worldcup.ics", ics, "utf8");
  console.log(`OK: wrote worldcup.ics — ${events} events, ${starred} starred`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
