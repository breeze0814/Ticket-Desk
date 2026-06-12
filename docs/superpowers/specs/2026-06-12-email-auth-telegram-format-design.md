# 邮箱验证码登录 + Telegram 消息美化设计方案

**设计日期**: 2026-06-12  
**状态**: 待实现

## 概述

为工单系统添加邮箱验证码登录功能（无需注册），同时美化 Telegram 通知消息格式。

### 核心目标

1. 用户通过邮箱验证码登录，无需注册账号
2. 工单提交时自动关联用户邮箱
3. 优化 Telegram 消息排版，提升可读性

### 技术选型

- **邮件服务**: Nodemailer + SMTP（支持 QQ/163/Gmail 等）
- **验证码规则**: 4 位数字，3 分钟有效期
- **认证方式**: JWT Token（存储在 localStorage）
- **验证码存储**: 内存 Map（适合单实例部署）
- **Telegram 格式**: HTML 格式（支持粗体、代码块、预格式化）

---

## 架构设计

### 系统组件

#### 新增模块

1. **邮件服务** (`src/mailer.js`)
   - 封装 Nodemailer
   - 提供发送验证码邮件的接口
   - 支持 SMTP 配置

2. **认证服务** (`src/auth.js`)
   - 验证码生成（4 位随机数字）
   - 验证码存储和验证（内存 Map）
   - JWT 签发和验证
   - 频率限制

3. **认证中间件** (`src/middleware/auth.js`)
   - 验证 JWT token
   - 提取用户邮箱信息
   - 保护需要认证的端点

4. **前端登录模块** (`public/auth.js`)
   - 登录弹窗 UI
   - 验证码发送和验证逻辑
   - Token 管理

#### 修改模块

1. **工单模块** (`src/tickets.js`)
   - 修改 `formatTicketMessage()` 使用 HTML 格式
   - 添加 `userEmail` 字段支持

2. **Telegram 模块** (`src/telegram.js`)
   - 添加 `parse_mode: 'HTML'` 参数

3. **应用主模块** (`src/app.js`)
   - 注册新的认证端点
   - 应用认证中间件

4. **前端界面** (`public/index.html`)
   - 添加登录弹窗 HTML 结构
   - 引入认证模块脚本

### 数据流

```
┌─────────┐
│ 用户访问 │
└────┬────┘
     │
     ▼
┌──────────────┐
│ 检查 JWT     │  ────Yes───► 显示工单表单
│ Token 有效？  │
└──────┬───────┘
       │ No
       ▼
┌──────────────┐
│ 显示登录弹窗  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌─────────────┐
│ 输入邮箱      │────►│ 生成验证码   │
└──────┬───────┘     │ 存储到内存   │
       │             │ 发送邮件     │
       │             └─────────────┘
       ▼
┌──────────────┐     ┌─────────────┐
│ 输入验证码    │────►│ 验证码校验   │
└──────────────┘     │ 签发 JWT     │
                     └──────┬──────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ 返回 Token   │
                     │ 前端存储     │
                     └──────┬──────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ 显示工单表单 │
                     └──────┬──────┘
                            │
                            ▼
                     ┌─────────────┐     ┌──────────────┐
                     │ 提交工单     │────►│ 验证 Token    │
                     │ (带 Token)   │     │ 提取邮箱      │
                     └─────────────┘     │ 发送 Telegram │
                                         └──────────────┘
```

---

## API 设计

### 新增端点

#### 1. POST /api/auth/send-code

发送验证码到用户邮箱。

**请求体:**
```json
{
  "email": "user@example.com"
}
```

**验证规则:**
- 邮箱格式校验
- 频率限制：同一邮箱 1 分钟内只能发送一次

**响应（成功）:**
```json
{
  "message": "验证码已发送到您的邮箱"
}
```

**响应（失败）:**
```json
{
  "error": "邮箱格式不正确"
}
```
或
```json
{
  "error": "请 45 秒后再试"
}
```

---

#### 2. POST /api/auth/verify-code

验证邮箱验证码并签发 JWT。

**请求体:**
```json
{
  "email": "user@example.com",
  "code": "1234"
}
```

**验证规则:**
- 验证码匹配
- 未过期（3 分钟内）
- 频率限制：同一 IP 每分钟最多尝试 5 次

**响应（成功）:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@example.com"
}
```

**响应（失败）:**
```json
{
  "error": "验证码错误或已过期"
}
```

---

### 修改端点

#### POST /api/tickets

现在需要 JWT 认证。

**请求头:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**请求体（不变）:**
```json
{
  "title": "无法登录",
  "contact": "13800138000",
  "category": "incident",
  "priority": "urgent",
  "description": "详细描述..."
}
```

**后端处理变化:**
- 从 JWT token 中提取 `userEmail`
- 工单对象中自动添加 `userEmail` 字段
- `contact` 字段保留（用于电话等其他联系方式）

**响应（未认证）:**
```json
{
  "error": "未登录或登录已过期"
}
```

---

## 数据结构设计

### 验证码存储（内存 Map）

```javascript
// src/auth.js
const verificationCodes = new Map();

// 数据结构
{
  "user@example.com": {
    "code": "1234",
    "expiresAt": 1718234567890,
    "sentAt": 1718234387890
  }
}
```

**清理策略:**
- 每 60 秒清理一次过期记录
- 验证成功后立即删除

---

### JWT Payload

```json
{
  "email": "user@example.com",
  "iat": 1718234567,
  "exp": 1718320967
}
```

**字段说明:**
- `email`: 用户邮箱
- `iat`: 签发时间（issued at）
- `exp`: 过期时间（expires，默认 24 小时后）

---

### 工单数据结构变化

**之前:**
```javascript
{
  title: "无法登录",
  contact: "user@example.com",
  category: "incident",
  priority: "urgent",
  description: "详细描述..."
}
```

**现在:**
```javascript
{
  title: "无法登录",
  contact: "13800138000",         // 现在用于电话等
  category: "incident",
  priority: "urgent",
  description: "详细描述...",
  userEmail: "user@example.com"  // 新增：从 JWT 提取
}
```

---

## 前端设计

### 登录流程

#### 页面加载

```javascript
// 检查 localStorage 中的 token
const token = localStorage.getItem('auth_token');

if (token && isTokenValid(token)) {
  // 显示工单表单
  showTicketForm();
} else {
  // 显示登录弹窗
  showLoginModal();
}
```

#### 登录弹窗 UI

**步骤 1: 输入邮箱**

```
┌─────────────────────────────────┐
│   🔐 邮箱验证登录                │
│                                 │
│   📧 邮箱地址                   │
│   ┌───────────────────────────┐ │
│   │ user@example.com          │ │
│   └───────────────────────────┘ │
│                                 │
│   ┌─────────────────────────┐   │
│   │     发送验证码           │   │
│   └─────────────────────────┘   │
│                                 │
│   💡 验证码将发送到您的邮箱      │
└─────────────────────────────────┘
```

**步骤 2: 输入验证码**

```
┌─────────────────────────────────┐
│   🔐 邮箱验证登录                │
│                                 │
│   验证码已发送到：               │
│   user@example.com              │
│                                 │
│   🔢 验证码（4位数字）           │
│   ┌─────┐                       │
│   │1234 │                       │
│   └─────┘                       │
│                                 │
│   ⏱️ 2:45 后过期                │
│   没收到？ [60s后重新发送]       │
│                                 │
│   [← 返回]       [确认登录]     │
└─────────────────────────────────┘
```

#### 登录成功

- 弹窗淡出消失
- 显示欢迎提示: "✅ 欢迎，user@example.com"
- Token 存储到 localStorage
- 显示工单表单

### 样式设计

**弹窗容器:**
```css
.auth-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.auth-modal-content {
  max-width: 400px;
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
```

**响应式适配:**
- 桌面端：居中弹窗，宽度 400px
- 移动端：全屏显示，保持内边距

### 前端文件结构

```
public/
├── index.html       # 添加登录弹窗 HTML
├── app.js           # 现有工单提交逻辑
├── auth.js          # 新增：认证逻辑
├── auth.css         # 新增：登录弹窗样式
├── styles.css       # 现有全局样式
└── responsive.css   # 现有响应式样式
```

---

## Telegram 消息格式

### 新格式（HTML）

```html
🎫 <b>新工单提交</b>
━━━━━━━━━━━━━━━━━━

👤 <b>用户信息</b>
📧 邮箱: <code>user@example.com</code>
📞 联系: <code>13800138000</code>

📋 <b>工单详情</b>
📌 标题: <b>无法登录后台管理系统</b>
📂 类型: 🚨 故障告警
⚠️ 优先级: 🔴 紧急

📝 <b>问题描述</b>
<pre>系统从今天上午开始无法登录，
一直提示密码错误，已尝试重置密码
但仍然无法解决...</pre>

🕐 提交时间: 2026-06-12 23:50:30
```

### 格式对比

**现有格式（纯文本）:**
```
新工单
标题: 无法登录后台管理系统
联系方式: 13800138000
类型: incident
优先级: urgent
描述: 详细描述...
```

**优化点:**
1. ✅ 使用 HTML 标签（`<b>`, `<code>`, `<pre>`）
2. ✅ 分区清晰（用户信息、工单详情、问题描述）
3. ✅ 表情符号作为视觉锚点
4. ✅ 分隔线增强层次感
5. ✅ `<code>` 标签高亮关键信息
6. ✅ `<pre>` 标签保持多行文本格式
7. ✅ 新增提交时间戳

### 实现修改

**src/tickets.js:**
```javascript
export function formatTicketMessage(ticket) {
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const categoryEmoji = {
    incident: '🚨 故障告警',
    account: '👤 账号问题',
    billing: '💳 支付问题',
    feature: '💡 需求反馈',
    other: '📝 其他问题'
  };

  const priorityEmoji = {
    normal: '🟢 普通',
    high: '🟡 高',
    urgent: '🔴 紧急'
  };

  return [
    '🎫 <b>新工单提交</b>',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '👤 <b>用户信息</b>',
    `📧 邮箱: <code>${ticket.userEmail}</code>`,
    `📞 联系: <code>${ticket.contact}</code>`,
    '',
    '📋 <b>工单详情</b>',
    `📌 标题: <b>${ticket.title}</b>`,
    `📂 类型: ${categoryEmoji[ticket.category] || ticket.category}`,
    `⚠️ 优先级: ${priorityEmoji[ticket.priority] || ticket.priority}`,
    '',
    '📝 <b>问题描述</b>',
    `<pre>${ticket.description}</pre>`,
    '',
    `🕐 提交时间: ${timestamp}`
  ].join('\n');
}
```

**src/telegram.js:**
```javascript
function buildRequest(chatId, ticket) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTicketMessage(ticket),
      parse_mode: 'HTML'  // 新增
    }),
  };
}
```

---

## 环境配置

### 新增环境变量

**.env 文件:**
```env
# 现有配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
HTTP_PROXY=http://proxy:port
HTTPS_PROXY=http://proxy:port

# 新增：邮件配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@qq.com
SMTP_PASS=your_smtp_auth_code
SMTP_FROM=工单系统 <your_email@qq.com>

# 新增：JWT 配置
JWT_SECRET=your_random_secret_key_here_min_32_chars
JWT_EXPIRES_IN=24h
```

**.env.example 更新:**
```env
# Telegram 配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# 代理配置（可选）
HTTP_PROXY=
HTTPS_PROXY=

# 邮件配置（SMTP）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@qq.com
SMTP_PASS=your_smtp_auth_code
SMTP_FROM=工单系统 <your_email@qq.com>

# JWT 认证
JWT_SECRET=generate_a_random_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=24h
```

### SMTP 配置说明

**常用邮箱 SMTP 配置:**

| 邮箱服务 | SMTP_HOST | SMTP_PORT | 说明 |
|---------|-----------|-----------|------|
| QQ 邮箱 | smtp.qq.com | 587 | 需开启 SMTP 服务，使用授权码 |
| 163 邮箱 | smtp.163.com | 465 | 需开启 SMTP 服务，使用授权码 |
| Gmail | smtp.gmail.com | 587 | 需开启"不太安全的应用访问" |
| Outlook | smtp-mail.outlook.com | 587 | 使用账号密码 |

**获取授权码步骤（以 QQ 邮箱为例）:**
1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange 服务
3. 开启 "SMTP 服务"
4. 生成授权码（16 位）
5. 将授权码填入 `SMTP_PASS`

---

## 依赖包更新

### package.json 新增依赖

```json
{
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "undici": "^8.4.1",
    "nodemailer": "^6.9.8",        // 新增
    "jsonwebtoken": "^9.0.2"       // 新增
  }
}
```

**安装命令:**
```bash
npm install nodemailer jsonwebtoken
```

---

## 安全考虑

### 频率限制

**1. 发送验证码限制**
- 同一邮箱：1 分钟内只能发送 1 次
- 同一 IP：1 分钟内最多发送 3 次（防止滥用）

**2. 验证码验证限制**
- 同一 IP：1 分钟内最多尝试 5 次（防暴力破解）
- 验证失败 3 次后，该验证码失效

**3. 工单提交限制（保持现有）**
- 同一 IP：1 分钟内最多提交 3 次

### JWT 安全

**密钥要求:**
- 最少 32 个字符
- 使用随机生成器生成
- 不要提交到 git

**生成示例:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Token 过期策略:**
- 默认 24 小时过期
- 前端检测过期后自动弹出登录窗口

### 验证码安全

**存储策略:**
- 使用内存存储（重启丢失，可接受）
- 验证成功后立即删除
- 定时清理过期记录（每 60 秒）

**生成策略:**
- 使用 `crypto.randomInt()` 生成
- 4 位数字（1000-9999）
- 避免使用 `Math.random()`（不够安全）

---

## 错误处理

### 邮件发送失败

**可能原因:**
1. SMTP 配置错误
2. 授权码过期
3. 邮箱服务限流
4. 网络问题

**处理策略:**
- 记录详细错误日志
- 返回用户友好提示："验证码发送失败，请稍后重试"
- 不暴露具体的 SMTP 错误信息

### JWT 验证失败

**可能原因:**
1. Token 过期
2. Token 格式错误
3. 密钥不匹配
4. Token 被篡改

**处理策略:**
- 返回 401 状态码
- 前端自动清除无效 token
- 重新弹出登录窗口

### 验证码错误

**可能原因:**
1. 验证码输入错误
2. 验证码已过期
3. 验证码已被使用

**处理策略:**
- 明确告知用户错误原因
- 提供重新发送选项
- 记录失败尝试次数

---

## 测试策略

### 单元测试

**需要测试的模块:**

1. **src/auth.js**
   - 验证码生成
   - 验证码验证（正确、错误、过期）
   - JWT 签发和验证
   - 频率限制

2. **src/mailer.js**
   - 邮件发送（mock SMTP）
   - 邮件内容格式
   - 错误处理

3. **src/tickets.js**
   - 新的消息格式化函数
   - HTML 标签转义（防 XSS）

### 集成测试

**测试场景:**

1. **完整登录流程**
   - 发送验证码 → 验证成功 → 获取 token
   
2. **工单提交流程**
   - 带 token 提交 → 验证通过 → Telegram 通知

3. **认证失败场景**
   - 无 token 提交工单 → 返回 401
   - 过期 token 提交工单 → 返回 401

4. **频率限制测试**
   - 连续发送验证码 → 被限流
   - 连续验证错误 → 被限流

### 手动测试清单

- [ ] 邮箱格式验证
- [ ] 验证码邮件接收
- [ ] 验证码有效期（3 分钟）
- [ ] 登录成功后 token 存储
- [ ] 刷新页面后保持登录状态
- [ ] Token 过期后重新登录
- [ ] 工单提交带上用户邮箱
- [ ] Telegram 消息格式正确显示
- [ ] 移动端响应式布局

---

## 实施计划

### 阶段 1: 后端基础设施（优先级：高）

1. **安装依赖**
   - nodemailer
   - jsonwebtoken

2. **创建邮件服务模块** (`src/mailer.js`)
   - SMTP 配置
   - 发送验证码邮件函数
   - 错误处理

3. **创建认证服务模块** (`src/auth.js`)
   - 验证码生成和存储
   - 验证码验证逻辑
   - JWT 签发和验证
   - 频率限制逻辑

4. **创建认证中间件** (`src/middleware/auth.js`)
   - JWT token 验证
   - 提取用户信息

### 阶段 2: API 端点（优先级：高）

1. **添加认证端点** (`src/app.js`)
   - POST /api/auth/send-code
   - POST /api/auth/verify-code

2. **修改工单端点**
   - 应用认证中间件
   - 从 token 提取 userEmail
   - 修改工单数据结构

### 阶段 3: Telegram 消息优化（优先级：中）

1. **修改消息格式化函数** (`src/tickets.js`)
   - 使用 HTML 格式
   - 添加表情和分隔线
   - 添加时间戳

2. **修改 Telegram 请求** (`src/telegram.js`)
   - 添加 parse_mode: 'HTML'

### 阶段 4: 前端实现（优先级：高）

1. **创建登录模块** (`public/auth.js`)
   - API 调用函数
   - Token 管理
   - 登录流程控制

2. **创建登录 UI** (`public/index.html`, `public/auth.css`)
   - 登录弹窗 HTML
   - 样式实现
   - 响应式适配

3. **修改工单提交** (`public/app.js`)
   - 检查 token 状态
   - 请求头添加 Authorization

### 阶段 5: 测试和文档（优先级：中）

1. **编写测试**
   - 认证模块单元测试
   - API 集成测试
   - 前端 E2E 测试

2. **更新文档**
   - README.md 添加配置说明
   - 环境变量文档
   - 部署指南

---

## 回滚计划

如果新功能出现问题，可以快速回滚：

### 后端回滚
1. 移除认证中间件
2. 恢复旧的工单提交端点（不需要认证）
3. 恢复旧的 Telegram 消息格式

### 前端回滚
1. 移除登录弹窗
2. 恢复原有的工单表单
3. 移除 token 相关逻辑

### 配置回滚
- 邮件配置不影响现有功能，可保留

---

## 后续优化方向

### 短期（1-2 周）

1. **验证码样式优化**
   - 发送 HTML 格式邮件
   - 添加品牌 logo
   - 优化邮件排版

2. **用户体验改进**
   - 记住用户邮箱（下次自动填充）
   - 验证码输入框自动聚焦
   - 倒计时动画优化

### 中期（1 个月）

1. **多实例支持**
   - 引入 Redis 存储验证码
   - Session 共享

2. **监控和告警**
   - 邮件发送成功率监控
   - 验证码验证失败率监控
   - 异常登录告警

### 长期（3 个月）

1. **多因素认证**
   - 支持手机验证码
   - 支持第三方登录（GitHub、Google）

2. **用户管理**
   - 用户历史工单查询
   - 工单状态追踪
   - 邮件通知工单进展

---

## 风险评估

### 高风险

**邮件发送失败**
- **影响**: 用户无法登录
- **概率**: 中
- **缓解**: 详细日志、多个备用 SMTP 配置、降级到短信验证码

**JWT 密钥泄露**
- **影响**: 安全漏洞
- **概率**: 低
- **缓解**: 环境变量管理、不提交到 git、定期轮换

### 中风险

**验证码被暴力破解**
- **影响**: 账号安全
- **概率**: 低
- **缓解**: 频率限制、失败次数限制、验证码复杂度提升

**SMTP 服务限流**
- **影响**: 部分用户无法收到验证码
- **概率**: 中
- **缓解**: 多个 SMTP 账号轮换、使用专业邮件服务

### 低风险

**内存验证码丢失**
- **影响**: 服务重启时用户需重新发送
- **概率**: 低
- **缓解**: 可接受的用户体验损失、后续迁移到 Redis

---

## 总结

### 核心价值

1. **安全性提升**: 通过邮箱验证确保用户身份
2. **用户体验**: 无需注册，快速登录
3. **可追溯性**: 工单自动关联用户邮箱
4. **信息清晰**: Telegram 消息格式优化，提升可读性

### 技术亮点

1. **轻量级设计**: 无数据库依赖，适合小规模部署
2. **现代化认证**: JWT + localStorage 前后端分离
3. **易于维护**: 模块化设计，职责清晰
4. **可扩展性**: 预留多实例支持的接口

### 预期效果

- 用户登录成功率: > 95%
- 验证码接收时间: < 30 秒
- 工单邮箱关联准确率: 100%
- Telegram 消息可读性提升: 显著

---

## 附录

### A. 验证码邮件模板

**纯文本版本:**
```
您的验证码是：1234

此验证码将在 3 分钟后过期，请尽快使用。

如果这不是您的操作，请忽略此邮件。

—— 工单系统
```

**HTML 版本（后续优化）:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .code { font-size: 32px; font-weight: bold; color: #0088cc; }
  </style>
</head>
<body>
  <h2>🔐 邮箱验证</h2>
  <p>您的验证码是：</p>
  <p class="code">1234</p>
  <p>此验证码将在 <strong>3 分钟</strong>后过期，请尽快使用。</p>
  <hr>
  <p style="color: #999;">如果这不是您的操作，请忽略此邮件。</p>
</body>
</html>
```

### B. 常见问题排查

**1. 收不到验证码邮件**
- 检查 SMTP 配置是否正确
- 查看服务器日志中的错误信息
- 检查邮箱的垃圾箱
- 确认邮箱服务商未限流

**2. JWT token 无效**
- 检查 JWT_SECRET 是否一致
- 确认 token 未过期
- 检查前端是否正确传递 Authorization 头

**3. 验证码一直提示错误**
- 确认邮箱和验证码匹配
- 检查是否超过 3 分钟有效期
- 查看服务器时间是否正确

**4. Telegram 消息格式错误**
- 检查是否添加 parse_mode: 'HTML'
- 确认消息内容符合 Telegram HTML 规范
- 特殊字符需转义（<, >, &）

---

**设计完成日期**: 2026-06-12  
**设计版本**: 1.0  
**审核状态**: 待用户审核
