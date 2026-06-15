#!/usr/bin/env node
// 2026 世界杯日历构建脚本
// 赛程骨架/淘汰赛占位/时区来自 fixtur.es；比分优先用 football-data（更及时，fixtur.es 比分常滞后）。
// 队名/轮次翻译中文，关注队（法/英/巴/阿/葡）标题加 ⭐。输出 worldcup.ics。
// GitHub Actions 定时运行；football-data token 从环境变量 FOOTBALL_DATA_TOKEN 读（GitHub Secret，不入库）。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://ics.fixtur.es/v2/league/fifa-world-cup-2026.ics";
const FD_API = "https://api.football-data.org/v4/competitions/WC/matches";
const FAV = ["France", "England", "Brazil", "Argentina", "Portugal"];
const STAR = "⭐ ";
const CAL_NAME = "2026 世界杯 ⭐ 法英巴阿葡";
const CAL_DESC = "2026 FIFA World Cup · 关注队加⭐ · 中文 · 比分(football-data)+淘汰赛对阵自动更新 · 赛程源 fixtur.es";

// football-data 队名 → fixtur.es 队名（仅 5 个拼写不同，其余一致）
const FD_NORM = {
  "Turkey": "Türkiye", "Czechia": "Czech Republic", "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde", "Bosnia-Herzegovina": "Bosnia and Herzegovina",
};
const normFD = (name) => FD_NORM[name] || name;

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
const TEAM_KEYS = Object.keys(TEAM).sort((a, b) => b.length - a.length);

// 16 球场 → 中文球场名·举办城市
const VENUE = {
  "AT&T": "AT&T 球场·达拉斯", "SoFi": "SoFi 球场·洛杉矶", "MetLife": "大都会人寿球场·纽约",
  "Mercedes-Benz": "奔驰球场·亚特兰大", "NRG": "NRG 球场·休斯顿", "Hard Rock": "硬石球场·迈阿密",
  "Gillette": "吉列球场·波士顿", "BC Place": "BC 球场·温哥华", "Lumen Field": "流明球场·西雅图",
  "Lincoln Financial Field": "林肯金融球场·费城", "Levi's": "李维斯球场·旧金山",
  "GEHA Field at Arrowhead": "箭头球场·堪萨斯城", "BMO Field": "BMO 球场·多伦多",
  "Estadio Banorte": "阿兹特克球场·墨西哥城", "Estadio BBVA": "BBVA 球场·蒙特雷",
  "Estadio Akron": "阿克隆球场·瓜达拉哈拉",
};

// 从 football-data 响应建比分索引：key=排序后的队名对，value={home,away,fh,fa}
export function buildScoreIndex(fbJson) {
  const idx = new Map();
  for (const m of fbJson.matches || []) {
    const h = m.homeTeam && m.homeTeam.name, a = m.awayTeam && m.awayTeam.name;
    if (!h || !a) continue;
    const ft = m.score && m.score.fullTime;
    if (!ft || ft.home == null || ft.away == null) continue;   // 无比分跳过
    const H = normFD(h), A = normFD(a);
    idx.set([H, A].sort().join("|"), { home: H, away: A, fh: ft.home, fa: ft.away });
  }
  return idx;
}

// 用 football-data 比分覆盖/补充一条英文 SUMMARY（仅真实队名对，淘汰赛占位跳过）
function applyScore(summary, idx) {
  if (!idx || summary.includes(":") || summary.includes(" vs ")) return summary;
  const bare = summary.replace(/\s*\(\d+-\d+\)\s*$/, "");
  const parts = bare.split(" - ");
  if (parts.length !== 2) return summary;
  const a = parts[0].trim(), b = parts[1].trim();
  const e = idx.get([a, b].sort().join("|"));
  if (!e) return summary;
  const score = a === e.home ? `${e.fh}-${e.fa}` : `${e.fa}-${e.fh}`;
  return `${a} - ${b} (${score})`;
}

function toCN(title) {
  let t = title;
  t = t.replace("World Cup Final", "🏆 决赛").replace("World Cup 3rd place match", "🥉 三四名决赛");
  t = t.replace("Round of 32:", "32强 ·").replace("Round of 16:", "16强 ·")
       .replace("Quarter-final:", "1/4决赛 ·").replace("Semi-final:", "半决赛 ·");
  for (const en of TEAM_KEYS) if (t.includes(en)) t = t.split(en).join(TEAM[en]);
  t = t.replace(/3rd ([A-L/]+)/g, (m, g) => g + "组第3");
  t = t.replace(/\b([12])([A-L])\b/g, (m, n, g) => g + "组第" + n);
  t = t.replace(/\bW(\d+)\b/g, "胜者$1");
  return t;
}

// 纯函数：原始 fixtur.es .ics + 可选 football-data 比分索引 → { ics, starred, events }
export function transform(src, scoreIdx = null) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let starred = 0;
  for (let line of lines) {
    if (line.startsWith("SUMMARY:")) {
      let raw = applyScore(line.slice("SUMMARY:".length), scoreIdx);
      const fav = FAV.some((t) => raw.includes(t));
      let title = toCN(raw);
      if (fav) { title = STAR + title; starred++; }
      line = "SUMMARY:" + title;
    } else if (line.startsWith("X-WR-CALNAME:")) {
      line = "X-WR-CALNAME:" + CAL_NAME;
    } else if (line.startsWith("X-WR-CALDESC:")) {
      line = "X-WR-CALDESC:" + CAL_DESC;
    } else if (line.startsWith("LOCATION:")) {
      const loc = line.slice("LOCATION:".length).trim();
      if (VENUE[loc]) line = "LOCATION:" + VENUE[loc];
    }
    out.push(line);
  }
  const ics = out.join("\r\n");
  const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
  return { ics, starred, events };
}

async function main() {
  const icsRes = await fetch(SOURCE, { headers: { "User-Agent": "worldcup-cal-builder" } });
  if (!icsRes.ok) { console.error("fetch fixtur.es failed:", icsRes.status); process.exit(1); }

  // 可选：football-data 比分（有 token 才拉，本地无 token 时仅用 fixtur.es）
  let scoreIdx = null;
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (token) {
    try {
      const r = await fetch(FD_API, { headers: { "X-Auth-Token": token } });
      if (r.ok) {
        scoreIdx = buildScoreIndex(await r.json());
        console.log(`football-data: ${scoreIdx.size} 场比分`);
      } else {
        console.error("football-data HTTP", r.status, "— 仅用 fixtur.es 比分");
      }
    } catch (e) {
      console.error("football-data fetch 失败，仅用 fixtur.es 比分:", e.message);
    }
  } else {
    console.log("无 FOOTBALL_DATA_TOKEN，仅用 fixtur.es 比分");
  }

  const { ics, starred, events } = transform(await icsRes.text(), scoreIdx);
  if (events < 100) { console.error("sanity check failed: only", events, "events"); process.exit(1); }
  writeFileSync("worldcup.ics", ics, "utf8");
  console.log(`OK: wrote worldcup.ics — ${events} events, ${starred} starred`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
