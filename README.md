# Ticket Desk 工单系统

现代化的工单提交系统，支持实时通知。

## 功能特点

- 📝 友好的工单提交界面
- 🎨 现代化 UI/UX 设计
- 🔔 实时通知支持
- 🔒 IP 频率限制（防刷单）
- 📱 响应式设计

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 启动开发服务器
npm run dev
```

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问 http://localhost:3000

## 环境变量

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
PORT=3000
HTTP_PROXY=http://proxy:port
HTTPS_PROXY=http://proxy:port
```

## 技术栈

- Node.js + Express
- 原生 JavaScript
- Docker
