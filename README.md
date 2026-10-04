# 蕾忍宗 · 宗门大比

本地双人忍术格斗小游戏。半身黄脸忍者、原声招式、命中连段、三格怒气奥义。

## 第二卷 · v0.2

全屏 16:9 舞台与四入口主菜单；重绘黑头套、金黄色眼部、浮空手部和刀具；加入命中停顿、火刀、多重残影、奥义人物切入与能量束。暂停菜单直接调整总音量，设置中分开控制原声与打击音效。新手修炼共六步，需要真正完成移动、命中、三连、防御、忍术和奥义。

## 运行

这是原生 Canvas + Web Audio 项目，不需要 npm 或后端。双击 `index.html`；也可以在项目目录运行 `python -m http.server 8080`，再访问 `http://localhost:8080`。推荐桌面 Chromium/Edge；本版本未做 Windows 实体键盘和其他浏览器的完整验收。

公开源码不附带第三方音频。打开「原声大碟 → 导入音频」，选择自己的 `忍术.zip` 或音频文件。导入只在浏览器本地进行，不会上传。

生成单文件 HTML（Python 3.10+）：

```bash
python scripts/build_portable.py --output lexburner-play.html
# 将自己的音频包内置进便携版：
python scripts/build_portable.py --audio-zip /path/to/audio.zip --output lexburner-play.html
# 可选：先用 ffmpeg 压缩原始 WAV，减小包体
python scripts/prepare_audio.py /path/to/忍术.zip /path/to/audio-browser.zip
```

## 操作

| | P1 | P2 |
|---|---|---|
| 移动 / 跳跃 / 下蹲 | A D / W / S | ← → / ↑ / ↓ |
| 掌击 / 拔刀 / 防御 | J / K / L | Num1 / Num2 / Num3 |
| 十字斩 / 悠悠球 / 闪现 | U / I / O | Num4 / Num5 / Num6 |
| 三连（依次，命中后接） | J → J → K | Num1 → Num1 → Num2 |
| 黑龙武神（同时，需三格怒气） | J + K + L | Num1 + Num2 + Num3 |

Esc 暂停；M 静音；F2 判定框。完整搓招指令在「招式卷轴」。箭头“前、后”相对角色朝向，不是永远朝右。最多三键同时输入；键盘自身的按键冲突仍需实机检查。

## 战斗规则

掌击第一段、第二段、拔刀可在命中后依次取消收招，空挥和被防住时不能这样连。第三段拔刀会挑起对手；后续忍术可以追击，连段伤害递减。普通蕾克拉自动恢复；怒气只从攻防交换获得，最多三格，黑龙武神消耗三格且不会返还自身怒气。人机、双人和观战使用同一套规则，不调用云端模型。普通对局三局两胜，怒气跨小局保留；木桩模式不结算胜负。

## 文件

- `src/combat.js`：固定 60 Hz 规则、输入缓冲、连段、怒气、AI。
- `src/render.js`：原创程序化角色、场景、刀光与奥义演出。
- `src/audio.js`：原声导入、三路音量、合成打击音效。
- `src/game.js`：菜单、暂停、教程、回合与浏览器焦点管理。
- `tests/`：规则测试和浏览器交互测试。

```bash
node --test tests/*.test.cjs
```

详细验证及限制见 `VALIDATION.md`。参考与设计判断见 `docs/REFERENCES.md`。

## 权利说明

非官方同人项目，与 LexBurner、B 站及《死神 VS 火影》制作者无隶属关系。代码依项目 LICENSE；第三方原声不因为代码开源就获得同样授权。公开源码默认不包含原声文件。角色、场景和特效为程序化绘制，没有从参考游戏或二创视频提取其素材、代码或配乐。
