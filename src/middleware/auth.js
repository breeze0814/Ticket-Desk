/**
 * 创建 JWT 认证中间件
 * @param {Object} authService - 认证服务实例
 * @returns {Function} Express 中间件函数
 */
export function createAuthMiddleware(authService) {
  return (req, res, next) => {
    try {
      // 获取 Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: '未登录或登录已过期' });
      }

      // 提取 token (支持 Bearer 和 bearer)
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({ error: '未登录或登录已过期' });
      }

      const token = parts[1];

      // 验证 token
      const payload = authService.verifyToken(token);

      // 将用户邮箱添加到请求对象
      req.userEmail = payload.email;

      next();
    } catch (error) {
      return res.status(401).json({ error: '未登录或登录已过期' });
    }
  };
}
