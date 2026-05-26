# NeuroAccess

EEG 科普教育平台 — 让每个人都能读懂自己的脑电数据。

![NeuroAccess](https://img.shields.io/badge/version-v1.0%20RC-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![Status](https://img.shields.io/badge/status-Public%20Preview-orange)

## 项目简介

NeuroAccess 是一个面向公众的 EEG（脑电图）数据分析教育平台。用户上传 EEG 文件（EDF 格式），系统通过 MNE-Python 进行信号处理，并通过 AI（OpenRouter API）生成三层个性化解释（初学者 / 学生 / 研究者），帮助用户理解自己的脑电数据。

**非医疗用途**：本平台仅用于教育培训，不提供医疗诊断建议。

## 在线体验

- **生产环境**: http://43.160.238.2
- **Vercel 预览**: https://neuroaccess-v1-rc.vercel.app（国内可能无法访问）

## 核心功能

- 📊 **EEG 文件上传与分析** — 支持 EDF 格式，自动进行信号质量评估、频带功率分析
- 🤖 **AI 三层解释** — 初学者模式（类比生活）、学生模式（概念解析）、研究者模式（专业术语）
- 📈 **交互式图表** — 频带功率柱状图、频率分布折线图
- 🌐 **多语言支持** — 中文、英文、西班牙语、法语、德语、日语、韩语
- 🌙 **深色模式** — 完整的深色主题支持
- 📄 **PDF 导出** — 一键导出分析报告
- 💬 **反馈系统** — 用户对分析结果进行评分和反馈

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS 4 |
| 后端 | FastAPI + Python 3.11 + MNE-Python |
| AI | OpenRouter API (qwen/qwen-2.5-7b-instruct) |
| 部署 | Nginx + PM2 + 腾讯云（新加坡） |

## 快速开始

### 前端开发

```bash
git clone https://github.com/MossDominicus/NeuroAccess.git
cd NeuroAccess
npm install
npm run dev  # → localhost:3000
```

### 后端开发

```bash
cd NeuroAccess/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# 设置环境变量
export OPENROUTER_API_KEY="sk-or-v1-..."
export OPENROUTER_MODEL="qwen/qwen-2.5-7b-instruct"
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## 项目结构

```
NeuroAccess/
├── src/                  # 前端源码 (Next.js)
│   ├── app/             # App Router 页面
│   ├── components/       # React 组件
│   └── lib/            # 工具函数、Context
├── backend/             # 后端源码 (FastAPI)
│   ├── app.py          # FastAPI 主应用
│   ├── analysis.py     # EEG 分析核心
│   ├── explanations.py  # AI 解释生成
│   └── requirements.txt
├── scripts/             # 部署脚本
│   └── health-check.sh # 服务器健康监控
├── deploy/              # 部署配置
│   └── nginx.conf      # Nginx 配置模板
└── DEPLOYMENT.md       # 部署文档
```

## 部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 作者

**wmz (MossDominicus)** — EEG 研究员 / 全栈开发者

- GitHub: [@MossDominicus](https://github.com/MossDominicus)
- 项目始于 2026 年，为大学申请（NUS/NTU CS/AI/Neuroscience）准备的作品集项目

## 许可证

MIT License — 详见 [LICENSE](./LICENSE)（如不存在可自行添加）
