# 快速配置指南

## 📧 QQ 邮箱 SMTP 配置

你的 QQ 邮箱授权码已准备好，请按以下步骤配置：

### 1. 编辑 .env 文件

```bash
# 如果 .env 不存在，先复制示例文件
cp .env.example .env

# 然后编辑 .env
nano .env  # 或使用你喜欢的编辑器
```

### 2. 添加以下配置到 .env

```env
# Telegram 配置（保持原有配置）
TELEGRAM_BOT_TOKEN=你的_bot_token
TELEGRAM_CHAT_ID=你的_chat_id

# 服务器配置
PORT=3000

# 代理配置（如果不需要可以留空）
HTTP_PROXY=
HTTPS_PROXY=
NO_PROXY=localhost,127.0.0.1

# ========== 新增：邮件配置 ==========
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=breewsvvtilqbcai
SMTP_FROM=工单系统 <你的QQ邮箱@qq.com>

# ========== 新增：JWT 认证配置 ==========
JWT_SECRET=e11f721fdefd5d3358c7af014fa9db6ba52884bd76a2a1c3149e9ca4f497b438
JWT_EXPIRES_IN=24h
```

### 3. 重要提示

⚠️ **SMTP_USER** - 替换为你的完整 QQ 邮箱地址（例如：123456789@qq.com）  
⚠️ **SMTP_PASS** - 授权码 `breewsvvtilqbcai` 已经填好  
⚠️ **SMTP_FROM** - 发件人显示名称，也要填写你的邮箱  
⚠️ **JWT_SECRET** - 已经生成好，直接使用即可

### 4. 配置示例

如果你的 QQ 邮箱是 `1234567890@qq.com`，配置应该是：

```env
SMTP_USER=1234567890@qq.com
SMTP_PASS=breewsvvtilqbcai
SMTP_FROM=工单系统 <1234567890@qq.com>
```

## 🚀 启动服务

配置完成后，启动服务：

```bash
# 方式 1: 开发模式（推荐首次测试）
npm run dev

# 方式 2: 生产模式
npm start

# 方式 3: Docker
docker-compose up -d
```

## 🧪 测试验证

1. 访问 http://localhost:3000
2. 应该自动弹出登录窗口
3. 输入一个有效的邮箱地址（可以是任何邮箱）
4. 点击"发送验证码"
5. 检查邮箱收件箱（可能在垃圾邮件中）
6. 输入4位验证码
7. 登录成功！

## 📝 常见问题

### Q: 收不到验证码邮件？
A: 
1. 检查 SMTP_USER 是否填写了完整邮箱
2. 检查授权码是否正确（breewsvvtilqbcai）
3. 查看垃圾邮件文件夹
4. 查看服务器日志：`npm run dev` 或 `docker-compose logs -f`

### Q: 授权码在哪里获取？
A: 
你已经提供了授权码：`breewsvvtilqbcai`
这是从 QQ 邮箱 → 设置 → 账户 → SMTP 服务生成的。

### Q: JWT_SECRET 是什么？
A: 
已经为你生成了一个安全的随机密钥：
`e11f721fdefd5d3358c7af014fa9db6ba52884bd76a2a1c3149e9ca4f497b438`

### Q: 可以用其他邮箱接收验证码吗？
A: 
可以！登录时输入的邮箱可以是任何邮箱（Gmail、163等），验证码会从你配置的 QQ 邮箱发出。

## ✅ 配置检查清单

- [ ] 已复制 .env.example 到 .env
- [ ] 已填写 SMTP_USER（完整 QQ 邮箱地址）
- [ ] 已填写 SMTP_PASS（breewsvvtilqbcai）
- [ ] 已填写 SMTP_FROM（你的邮箱）
- [ ] 已填写 JWT_SECRET（e11f7...）
- [ ] 已保存 .env 文件
- [ ] 已启动服务
- [ ] 测试登录功能成功

## 🎉 完成！

配置完成后，你的工单系统就完全可用了！

---

**需要帮助？** 查看完整文档：
- README.md - 项目说明
- DEPLOYMENT_CHECKLIST.md - 详细部署指南
- TEST_REPORT.md - 测试和验证
