#!/usr/bin/env node
// 2026 世界杯日历构建脚本
// 拉取 fixtur.es 的世界杯 .ics（赛程+比分+淘汰赛占位），
// 队名/轮次翻译为中文，关注队（法/英/巴/阿/葡）的比赛标题加 ⭐ 前缀，输出 worldcup.ics。
// 在 GitHub Actions runner 上定时运行（直连 fixtur.es，无需代理）。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://ics.fixtur.es/v2/league/fifa-world-cup-2026.ics";
// 关注球队（fixtur.es 使用的英文队名，匹配在翻译前进行）。
// 淘汰赛对阵确定后 fixtur.es 会填真名，届时自动命中加 ⭐。
const FAV = ["France", "England", "Brazil", "Argentina", "Portugal"];
const STAR = "⭐ ";
const CAL_NAME = "2026 世界杯 ⭐ 法英巴阿葡";
const CAL_DESC = "2026 FIFA World Cup · 关注队(法/英/巴/阿/葡)加⭐高亮 · 中文 · 比分与淘汰赛对阵自动更新 · 数据源 fixtur.es";

// 48 强中文队名
const TEAM = {
  "Algeria": "阿尔及利亚", "Argentina": "阿根廷", "Australia": "澳大利亚", "Austria": "奥地利",
  "Belgium": "比利时", "Bosnia and Herzegovina": "波黑", "Brazil": "巴西", "Canada": "加拿大",
  "Cape Verde": "佛得角", "Colombia": "哥伦比亚", "Croatia": "克罗地亚", "Curaçao": "库拉索",
  "Czech Republic": "捷克", "DR Congo": "刚果(金)", "Ecuador": "厄瓜多尔", "Egypt": "埃及",
  "England": "英格兰", "France": "法国", "Germany": "德国", "Ghana": "加纳", "Haiti": "海地",
  "Iran": "伊朗", "Iraq": "伊拉克", "Ivory Coast": "科特迪瓦", "Japan": "日本", "Jordan": "约旦",
  "Mexico": "墨西哥", "Morocco": "摩洛哥", "Netherlands": "荷兰", "New Zealand": "新西兰",
  "Norway": "挪威", "Panama": "巴拿马", "Paraguay": "巴拉圭", "Portugal": "葡萄牙", "Qatar": "卡塔尔",
  "Saudi Arabia": "沙特", "Scotland": "苏格兰", "Senegal": "塞内加尔", "South Africa": "南非",
  "South Korea": "韩国", "Spain": "西班牙", "Sweden": "瑞典", "Switzerland": "瑞士", "Tunisia": "突尼斯",
  "Türkiye": "土耳其", "United States": "美国", "Uruguay": "乌拉圭", "Uzbekistan": "乌兹别克斯坦",
};
// 按长度降序替换，避免短名误伤长名
const TEAM_KEYS = Object.keys(TEAM).sort((a, b) => b.length - a.length);

// 把一条英文 SUMMARY 标题翻译为中文（队名、轮次、占位符）
function toCN(title) {
  let t = title;
  t = t.replace("World Cup Final", "🏆 决赛").replace("World Cup 3rd place match", "🥉 三四名决赛");
  t = t.replace("Round of 32:", "32强 ·").replace("Round of 16:", "16强 ·")
       .replace("Quarter-final:", "1/4决赛 ·").replace("Semi-final:", "半决赛 ·");
  for (const en of TEAM_KEYS) if (t.includes(en)) t = t.split(en).join(TEAM[en]);
  // 占位符：3rd C/E/F → C/E/F组第3；1A/2F → A组第1/F组第2；W14 → 胜者14
  t = t.replace(/3rd ([A-L/]+)/g, (m, g) => g + "组第3");
  t = t.replace(/\b([12])([A-L])\b/g, (m, n, g) => g + "组第" + n);
  t = t.replace(/\bW(\d+)\b/g, "胜者$1");
  return t;
}

// 纯函数：输入原始 .ics 文本，输出 { ics, starred, events }
export function transform(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let starred = 0;
  for (let line of lines) {
    if (line.startsWith("SUMMARY:")) {
      const raw = line.slice("SUMMARY:".length);
      const fav = FAV.some((t) => raw.includes(t));   // 用英文原名匹配关注队
      let title = toCN(raw);
      if (fav) { title = STAR + title; starred++; }
      line = "SUMMARY:" + title;
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
