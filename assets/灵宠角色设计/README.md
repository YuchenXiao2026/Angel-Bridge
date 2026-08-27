# 十二生肖角色素材

本目录包含从原始角色合图中分离出的 12 个独立角色：

- `01-rat` 子鼠
- `02-ox` 丑牛
- `03-tiger` 寅虎
- `04-rabbit` 卯兔
- `05-dragon` 辰龙
- `06-snake` 巳蛇
- `07-horse` 午马
- `08-goat` 未羊
- `09-monkey` 申猴
- `10-rooster` 酉鸡
- `11-dog` 戌狗
- `12-pig` 亥猪

每个角色提供两种格式：

- `.svg`：独立 SVG 画布，透明背景，可直接通过 `<img>`、CSS background 或前端组件引用。
- `.png`：透明背景原始位图，适合继续编辑或在 Canvas 中使用。

示例：

```html
<img src="/assets/zodiac-characters/03-tiger.svg" alt="寅虎" />
```

说明：原图是高细节 3D 渲染图，因此 SVG 使用内嵌透明 PNG 的方式保留材质细节，并非由矢量路径重绘。
