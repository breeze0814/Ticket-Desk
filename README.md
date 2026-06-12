# Ticket Desk 工单系统

现代化的工单提交系统，支持邮箱验证登录和实时通知。

## 功能特点

- 🔐 邮箱验证码登录（无需注册）
- 📝 友好的工单提交界面
- 🎨 现代化 UI/UX 设计
- 🔔 实时 Telegram 通知（美化格式）
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

### 服务端口

应用内部固定监听 `3000`。Docker Compose 使用 `.env` 中的 `PORT`
作为宿主机映射端口，例如 `PORT=30022` 时访问
`http://localhost:30022`，容器内部仍监听 `3000`。

### Telegram 配置

```env
TELEGRAM_BOT_TOKEN=your_bot_token  # 从 @BotFather 获取
TELEGRAM_CHAT_ID=your_chat_id      # 你的 Telegram 用户 ID
```

### 邮件配置（SMTP）

支持任何 SMTP 服务，常用配置：

**QQ 邮箱:**
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@qq.com
SMTP_PASS=your_authorization_code  # 授权码，非密码
SMTP_FROM=工单系统 <your_email@qq.com>
```

**获取 QQ 邮箱授权码:**
1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP 服务
3. 开启 "SMTP 服务"
4. 生成授权码（16 位）

**163 邮箱:**
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@163.com
SMTP_PASS=your_authorization_code
SMTP_FROM=工单系统 <your_email@163.com>
```

### JWT 配置

```env
JWT_SECRET=随机生成的密钥（至少32字符）
JWT_EXPIRES_IN=24h  # Token 有效期
```

生成安全的 JWT 密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 代理配置（可选）

如果需要通过代理访问 Telegram API：

```env
HTTP_PROXY=http://proxy:port
HTTPS_PROXY=http://proxy:port
```

## 使用流程

1. **访问系统** - 打开 http://localhost:3000
2. **邮箱登录** - 输入邮箱，接收验证码
3. **验证登录** - 输入4位验证码，获得24小时登录状态
4. **提交工单** - 填写工单信息提交
5. **接收通知** - Telegram 实时收到格式化通知

## 技术栈

- **后端**: Node.js + Express
- **认证**: JWT + Nodemailer
- **通知**: Telegram Bot API (HTML 格式)
- **前端**: 原生 JavaScript
- **部署**: Docker + Docker Compose

## 开发

### 运行测试

```bash
npm test
```

### 开发模式（自动重启）

```bash
npm run dev
```

## 故障排查

### 收不到验证码邮件

- 检查 SMTP 配置是否正确
- 确认使用的是授权码（不是登录密码）
- 查看垃圾邮件文件夹
- 检查服务器日志：`docker-compose logs -f`

### Token 过期或无效

- Token 默认 24 小时有效期
- 重新登录即可获取新 token
- 清除浏览器缓存：打开开发者工具 → Application → Local Storage → Clear

### Telegram 收不到通知

- 检查 Bot Token 和 Chat ID 是否正确
- 确认已与 Bot 对话（发送 `/start`）
- 检查代理配置（如果使用）

## 许可证

MIT
