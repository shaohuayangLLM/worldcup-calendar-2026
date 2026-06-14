# 2026 世界杯日历 ⭐

个人自用：订阅一次，在 iPhone / Mac 系统日历看 **2026 世界杯全部 104 场赛程 + 比分 + 淘汰赛动态对阵**，按北京时间显示，**法/英/巴/阿/葡的比赛标题带 ⭐ 高亮**。

## 怎么用

**订阅地址**（webcal，自动更新）：
```
webcal://raw.githubusercontent.com/shaohuayangLLM/worldcup-calendar-2026/main/worldcup.ics
```
HTTPS 形式（同一份）：
```
https://raw.githubusercontent.com/shaohuayangLLM/worldcup-calendar-2026/main/worldcup.ics
```

### Mac
- 日历 App → 文件 → 新建日历订阅 → 粘贴上面的 webcal 地址 → 自动刷新选「每小时」。

### iPhone
- 方式一（订阅，推荐，自动更新）：Safari 打开上面的 webcal 链接 → 提示订阅 → 确认。
- 方式二（一键导入文件）：把 `worldcup.ics` 文件 AirDrop 到 iPhone → 点开 → 加入日历（注意：导入是**静态快照**，不会自动更新；要自动更新请用方式一）。

## 工作原理
- 数据源：[fixtur.es](https://fixtur.es/en/fifa-world-cup-2026)（赛程 + 比分 + 淘汰赛占位，免费）。
- `build.mjs`：拉取源 .ics → 给关注队比赛标题加 ⭐ → 改日历名 → 输出 `worldcup.ics`。
- GitHub Actions 每 30 分钟跑一次，比分和淘汰赛对阵自动更新（对阵确定后占位 `W14 vs W16` 自动变真实队名，关注队晋级后自动加 ⭐）。
- 比分有延迟（源更新 + GitHub 定时 + 日历客户端刷新叠加，约 15–40 分钟），符合「可接受延迟」定位。

## 手动刷新
不想等定时，立刻刷新：
```
gh workflow run update.yml
```
或 GitHub 网页 → Actions → Update World Cup Calendar → Run workflow。

## 改关注队
编辑 `build.mjs` 里的 `FAV` 数组（用 fixtur.es 的英文队名），推送即可。

## 整体移除
- Mac：日历 App → 右键该订阅日历 →「删除」。
- iPhone：设置 → 日历 → 账户 → 订阅的日历 → 删除；或日历 App 里编辑日历删除。
- 彻底停更：删除/归档本 GitHub 仓库即可。

## 备用数据源
若 fixtur.es 失效，备用 football-data.org（免费 token 已注册，存于本地需求文档），可改 `build.mjs` 切换数据源。
