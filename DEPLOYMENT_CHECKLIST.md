# 部署检查清单

## 部署前准备

### 1. 环境配置 ✅

#### 必需配置
- [ ] **TELEGRAM_BOT_TOKEN** - 从 @BotFather 获取
- [ ] **TELEGRAM_CHAT_ID** - 你的 Telegram 用户 ID
- [ ] **SMTP_HOST** - SMTP 服务器地址（如 smtp.qq.com）
- [ ] **SMTP_PORT** - SMTP 端口（587 或 465）
- [ ] **SMTP_SECURE** - 是否使用 SSL/TLS（true/false）
- [ ] **SMTP_USER** - SMTP 用户名（邮箱地址）
- [ ] **SMTP_PASS** - SMTP 密码或授权码
- [ ] **SMTP_FROM** - 发件人显示名称和邮箱
- [ ] **JWT_SECRET** - JWT 密钥（至少32字符）

#### 可选配置
- [ ] **JWT_EXPIRES_IN** - Token 有效期（默认 24h）
- [ ] **PORT** - 服务端口（默认 3000）
- [ ] **HTTP_PROXY** - HTTP 代理（如需要）
- [ ] **HTTPS_PROXY** - HTTPS 代理（如需要）

#### 生成 JWT 密钥
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 获取 QQ 邮箱授权码
1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP 服务
3. 开启 "SMTP 服务"
4. 生成授权码（16位）

### 2. 代码质量检查 ✅

- [x] 所有单元测试通过（52/52）
- [x] 代码已提交到 Git
- [x] 无 console.error 未处理
- [x] 无敏感信息泄露

### 3. 依赖检查 ✅

```bash
npm list
```

验证所有依赖已安装：
- [x] express
- [x] dotenv
- [x] undici
- [x] nodemailer
- [x] jsonwebtoken

## 本地部署

### 方法 1: Node.js 直接运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入配置

# 3. 运行测试
npm test

# 4. 启动服务
npm start
```

- [ ] 服务成功启动
- [ ] 访问 http://localhost:3000
- [ ] 日志无错误

### 方法 2: Docker Compose

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入配置

# 2. 构建并启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 验证运行
curl http://localhost:3000
```

- [ ] 容器成功启动
- [ ] 无构建错误
- [ ] 日志正常

### 方法 3: Docker 手动构建

```bash
# 1. 构建镜像
docker build -t ticket-desk:latest .

# 2. 运行容器
docker run -d \
  --name ticket-desk \
  -p 3000:3000 \
  --env-file .env \
  ticket-desk:latest

# 3. 查看日志
docker logs -f ticket-desk
```

- [ ] 镜像构建成功
- [ ] 容器运行正常

## 功能验证

### 1. 登录功能测试

- [ ] 访问首页自动显示登录弹窗
- [ ] 输入邮箱发送验证码
- [ ] 收到验证码邮件（检查收件箱和垃圾邮件）
- [ ] 输入正确验证码登录成功
- [ ] 显示欢迎消息
- [ ] localStorage 存储 token

#### 错误场景测试
- [ ] 无效邮箱格式提示错误
- [ ] 60秒内重复发送被限制
- [ ] 错误验证码提示错误
- [ ] 过期验证码（3分钟后）拒绝
- [ ] 3次错误尝试后需重新发送

### 2. 工单提交测试

- [ ] 填写完整工单信息
- [ ] 提交成功
- [ ] 显示成功提示
- [ ] Telegram 收到通知

#### Telegram 消息格式验证
- [ ] 包含表情符号（🎫 📧 📞 等）
- [ ] HTML 格式正确渲染
  - [ ] 粗体标题
  - [ ] 代码块显示
  - [ ] 预格式化文本
- [ ] 包含用户邮箱
- [ ] 包含提交时间
- [ ] 分区清晰易读

#### 错误场景测试
- [ ] 未登录时返回 401
- [ ] 必填字段缺失提示错误
- [ ] Token 过期自动登出
- [ ] Telegram 发送失败提示 502

### 3. 频率限制测试

- [ ] 验证码发送：60秒内重复发送被拒绝
- [ ] 工单提交：1分钟内超过3次被限制
- [ ] 验证码验证：3次错误后需重新发送

### 4. 安全测试

- [ ] XSS 防护：输入 `<script>alert('xss')</script>`
  - [ ] 工单标题：转义显示
  - [ ] 工单描述：转义显示
  - [ ] Telegram 消息：转义显示
- [ ] Token 验证：删除 token 无法提交工单
- [ ] CSRF 防护：需要 Authorization 头

### 5. 响应式测试

- [ ] 桌面浏览器（1920x1080）
- [ ] 平板（768x1024）
- [ ] 手机（375x667）
  - [ ] 登录弹窗适配
  - [ ] 工单表单适配
  - [ ] 按钮可点击

### 6. 浏览器兼容性

- [ ] Chrome/Edge (最新版本)
- [ ] Firefox (最新版本)
- [ ] Safari (最新版本，如可用)

## 性能验证

### 响应时间

- [ ] 页面加载 < 1秒
- [ ] 验证码发送 < 3秒
- [ ] 验证码验证 < 1秒
- [ ] 工单提交 < 2秒

### 资源使用

```bash
# Docker 资源监控
docker stats ticket-desk
```

- [ ] CPU 使用率 < 10%（空闲时）
- [ ] 内存使用 < 100MB（空闲时）

## 生产部署

### 1. 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+ 推荐)
- **Node.js**: v24.x 或更高
- **内存**: 至少 512MB
- **磁盘**: 至少 1GB
- **网络**: 需要访问 Telegram API 和 SMTP 服务器

### 2. 安全加固

- [ ] 使用强 JWT 密钥（至少32字符随机）
- [ ] 启用 HTTPS（使用 Nginx 反向代理）
- [ ] 配置防火墙（只开放必要端口）
- [ ] 设置日志轮转
- [ ] 定期备份 .env 文件（安全存储）

### 3. 反向代理配置（Nginx 示例）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] Nginx 配置完成
- [ ] SSL 证书配置（Let's Encrypt）
- [ ] 自动跳转 HTTPS

### 4. 进程管理（PM2 示例）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/server.js --name ticket-desk

# 设置开机自启
pm2 startup
pm2 save
```

- [ ] PM2 配置完成
- [ ] 服务自动重启
- [ ] 日志正常记录

### 5. 监控和日志

```bash
# 查看 PM2 日志
pm2 logs ticket-desk

# 查看 Docker 日志
docker logs -f ticket-desk

# 监控服务状态
pm2 monit
```

- [ ] 日志配置完成
- [ ] 错误告警配置
- [ ] 性能监控配置

## 备份和恢复

### 备份内容

- [ ] .env 文件（敏感信息加密存储）
- [ ] 代码仓库（Git）
- [ ] Docker 镜像（如使用）

### 恢复测试

- [ ] 从备份恢复 .env
- [ ] 重新构建和启动
- [ ] 验证功能正常

## 回滚计划

如果部署失败：

1. **停止新版本**
   ```bash
   docker-compose down
   # 或
   pm2 stop ticket-desk
   ```

2. **恢复旧版本**
   ```bash
   git checkout <previous-commit>
   npm install
   npm start
   ```

3. **验证功能**
   - [ ] 登录功能正常
   - [ ] 工单提交正常
   - [ ] Telegram 通知正常

## 部署后验证

### 立即验证（部署后 5 分钟内）

- [ ] 服务正常启动
- [ ] 无崩溃或错误日志
- [ ] 登录功能正常
- [ ] 发送一个测试工单
- [ ] Telegram 收到通知

### 短期验证（部署后 1 小时内）

- [ ] 内存使用稳定
- [ ] CPU 使用正常
- [ ] 无异常日志
- [ ] 多次登录测试
- [ ] 多次提交测试

### 长期监控（部署后 24 小时）

- [ ] 服务持续运行
- [ ] 无内存泄漏
- [ ] 验证码清理正常
- [ ] 频率限制正常工作

## 用户通知

部署完成后，通知用户：

- [ ] 系统已更新，新增邮箱登录功能
- [ ] 需要使用邮箱登录才能提交工单
- [ ] 提供使用说明文档
- [ ] 提供问题反馈渠道

## 问题排查

### 常见问题

**问题 1: 收不到验证码邮件**
- 检查 SMTP 配置
- 检查授权码是否正确
- 检查垃圾邮件箱
- 查看服务器日志

**问题 2: Token 无效**
- 检查 JWT_SECRET 配置
- 清除浏览器 localStorage
- 重新登录

**问题 3: Telegram 收不到通知**
- 检查 Bot Token 和 Chat ID
- 确认已与 Bot 对话
- 检查代理配置

**问题 4: 服务无法启动**
- 检查端口占用
- 检查环境变量配置
- 查看详细错误日志

## 完成标记

- [ ] 所有配置项已填写
- [ ] 所有测试已通过
- [ ] 服务已部署
- [ ] 功能已验证
- [ ] 监控已配置
- [ ] 备份已完成
- [ ] 用户已通知

---

**部署日期**: _____________  
**部署人员**: _____________  
**服务地址**: _____________  
**备注**: _____________
