# 🎬 Video to GIF Converter

在浏览器中将视频转换为 GIF 动画的在线工具。

![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?style=flat&logo=vite)
![React](https://img.shields.io/badge/React-19.0+-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0+-38B2AC?style=flat&logo=tailwind-css)

## ✨ 功能特性

- 📤 **视频上传** - 支持拖拽或点击上传多种视频格式
- 🔄 **批量转换** - 一次性转换多个视频
- ✂️ **可视化裁剪** - 通过时间轴选择片段
- 🎨 **滤镜效果** - 黑白、复古、模糊、高亮、高对比
- 🔄 **倒放功能** - 支持视频倒放
- ⚙️ **参数调节** - 分辨率、帧率、质量可调
- 💾 **设置保存** - 刷新页面自动保留设置

## 🛠️ 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **视频处理**: FFmpeg.wasm

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/video2gif.git
cd video2gif

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🔧 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录。

## 📝 使用说明

1. 打开应用，上传视频文件
2. 使用时间轴选择要转换的片段
3. 调整分辨率、帧率等参数
4. 可选：添加滤镜效果或倒放
5. 点击"开始转换"
6. 转换完成后下载 GIF

## 📄 许可证

MIT License
