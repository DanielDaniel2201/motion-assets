# 贡献动效

欢迎提交新的 Motion Asset。只有想法或演示时，请先发到 [Discussions](https://github.com/DanielDaniel2201/motion-assets/discussions)；现有功能出错时，请提交 [Issue](https://github.com/DanielDaniel2201/motion-assets/issues)。

## 提交一个动效

1. Fork 本仓库，并创建一个描述动效内容的分支。
2. 参照现有动效实现：
   - 在 `src/assets/<motion-id>/` 添加 `definition.ts`、`timeline.ts` 和 `render.ts`。
   - 在 `src/components/` 添加对应的 Editor。
   - 在 `src/assets/registry.ts` 和 `src/App.tsx` 注册动效及入口。
   - 在 `tests/` 添加覆盖主要时间线或参数逻辑的测试。
3. 只修改这个动效需要的文件，不顺带重构无关代码。
4. 本地验证：

   ```bash
   npm ci
   npm run verify
   ```

5. 提交 Pull Request，并附上 GIF、截图或录屏，说明可调参数、输入要求和已知限制。

## 投稿要求

- 一个 Pull Request 只提交一个动效或一个独立修复。
- 预览与导出必须使用一致的动画逻辑。
- 不得提交无权使用或再分发的图片、视频、字体和其他素材。
- 提交者确认自己有权贡献相关代码和素材。
- 提交即表示贡献内容按照本仓库的 [MIT License](LICENSE) 授权。

维护者可能要求修改，也可能因产品方向、质量或维护成本拒绝投稿。
