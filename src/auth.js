import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Module-level storage for verification codes
const verificationCodes = new Map();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Constants
const CODE_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes
const RATE_LIMIT_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
const MAX_VERIFY_ATTEMPTS = 3; // Maximum verification attempts

/**
 * Creates an authentication service
 * @param {Object} config
 * @param {Object} config.mailer - Mailer instance
 * @param {string} config.jwtSecret - JWT secret key
 * @param {string} config.jwtExpiresIn - JWT expiration time
 * @returns {Object} Auth service instance
 */
export function createAuthService(config) {
  const { mailer, jwtSecret, jwtExpiresIn } = config;

  if (!mailer || !jwtSecret || jwtSecret.length < 32) {
    throw new Error('认证服务配置不完整或 JWT 密钥过短');
  }

  // Cleanup interval for expired codes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
      if (data.expiresAt < now) {
        verificationCodes.delete(email);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow cleanup to be stopped (useful for testing)
  const stopCleanup = () => clearInterval(cleanupInterval);

  /**
   * Validates email format
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email);
  }

  /**
   * Sends a verification code to the given email
   * @param {string} email
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async function sendVerificationCode(email) {
    // Validate email
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: '无效的邮箱地址'
      };
    }

    const now = Date.now();

    // Check rate limiting
    const existingCode = verificationCodes.get(email);
    if (existingCode && existingCode.sentAt + RATE_LIMIT_MS > now) {
      return {
        success: false,
        message: '验证码发送过于频繁，请稍后再试'
      };
    }

    // Generate 4-digit verification code
    const code = crypto.randomInt(1000, 10000).toString();

    // Store code with metadata
    verificationCodes.set(email, {
      code,
      expiresAt: now + CODE_EXPIRY_MS,
      sentAt: now,
      attempts: 0
    });

    // Send email
    try {
      await mailer.sendMail({
        to: email,
        subject: '登录验证码',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>登录验证码</h2>
            <p>您的验证码是：</p>
            <h1 style="color: #007bff; letter-spacing: 5px;">${code}</h1>
            <p>此验证码将在3分钟后失效。</p>
            <p>如果这不是您本人的操作，请忽略此邮件。</p>
          </div>
        `
      });

      return {
        success: true,
        message: '验证码已发送'
      };
    } catch (error) {
      // Remove stored code if email fails
      verificationCodes.delete(email);
      return {
        success: false,
        message: '验证码发送失败'
      };
    }
  }

  /**
   * Verifies a code for the given email
   * @param {string} email
   * @param {string} code
   * @returns {Promise<Object>} { success: true, token: string, email: string }
   * @throws {Error} If verification fails
   */
  async function verifyCode(email, code) {
    // Get the stored code data
    const codeData = verificationCodes.get(email);

    // Check if code exists
    if (!codeData) {
      throw new Error('验证码错误或已过期');
    }

    // Check if code has expired
    const now = Date.now();
    if (codeData.expiresAt < now) {
      verificationCodes.delete(email);
      throw new Error('验证码错误或已过期');
    }

    // Check if max attempts already exceeded
    if (codeData.attempts >= MAX_VERIFY_ATTEMPTS) {
      verificationCodes.delete(email);
      throw new Error('验证次数过多，请重新发送验证码');
    }

    // Check if code matches
    if (codeData.code !== code) {
      codeData.attempts += 1;

      // Check if max attempts reached after increment
      if (codeData.attempts >= MAX_VERIFY_ATTEMPTS) {
        verificationCodes.delete(email);
        throw new Error('验证次数过多，请重新发送验证码');
      }

      throw new Error('验证码错误或已过期');
    }

    // Code is correct - delete it and generate JWT token
    verificationCodes.delete(email);

    const token = jwt.sign(
      { email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return {
      success: true,
      token,
      email
    };
  }

  /**
   * Verifies a JWT token
   * @param {string} token
   * @returns {Object} Payload if valid
   * @throws {Error} If token is invalid or expired
   */
  function verifyToken(token) {
    try {
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      throw new Error('Token 无效或已过期');
    }
  }

  return {
    sendVerificationCode,
    verifyCode,
    verifyToken,
    stopCleanup, // Exposed for testing cleanup
    clearCodes: () => verificationCodes.clear() // Exposed for testing
  };
}
