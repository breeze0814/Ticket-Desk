import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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

  const verificationCodes = new Map();
  const context = {
    jwtExpiresIn,
    jwtSecret,
    mailer,
    verificationCodes,
  };
  const cleanupInterval = setInterval(
    () => deleteExpiredCodes(verificationCodes),
    CLEANUP_INTERVAL_MS,
  );

  // Allow cleanup to be stopped (useful for testing)
  const stopCleanup = () => clearInterval(cleanupInterval);

  return {
    sendVerificationCode: (email) => sendVerificationCode(context, email),
    verifyCode: (email, code) => verifyCode(context, { email, code }),
    verifyToken: (token) => verifyToken(jwtSecret, token),
    stopCleanup, // Exposed for testing cleanup
    clearCodes: () => verificationCodes.clear() // Exposed for testing
  };
}

async function sendVerificationCode(context, email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: '无效的邮箱地址'
    };
  }

  const rateLimit = checkCodeRateLimit(context.verificationCodes, normalizedEmail);
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: '验证码发送过于频繁，请稍后再试'
    };
  }

  const code = crypto.randomInt(1000, 10000).toString();
  storeVerificationCode(context.verificationCodes, { code, email: normalizedEmail });
  await sendCodeEmail(context, { code, email: normalizedEmail });

  return {
    success: true,
    message: '验证码已发送'
  };
}

async function verifyCode(context, params) {
  const normalizedEmail = normalizeEmail(params.email);
  const codeData = getActiveCode(context.verificationCodes, normalizedEmail);

  if (codeData.code !== params.code) {
    recordFailedAttempt(context.verificationCodes, normalizedEmail, codeData);
    throw new Error('验证码错误或已过期');
  }

  context.verificationCodes.delete(normalizedEmail);
  const token = jwt.sign(
    { email: normalizedEmail },
    context.jwtSecret,
    { expiresIn: context.jwtExpiresIn }
  );

  return {
    success: true,
    token,
    email: normalizedEmail
  };
}

function deleteExpiredCodes(verificationCodes) {
  const now = Date.now();

  for (const [email, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(email);
    }
  }
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

function checkCodeRateLimit(verificationCodes, email) {
  const existingCode = verificationCodes.get(email);
  const allowed = !existingCode || existingCode.sentAt + RATE_LIMIT_MS <= Date.now();
  return { allowed };
}

function storeVerificationCode(verificationCodes, params) {
  verificationCodes.set(params.email, {
    code: params.code,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
    sentAt: Date.now(),
    attempts: 0
  });
}

async function sendCodeEmail(context, params) {
  try {
    await context.mailer.sendVerificationCode(params.email, params.code);
  } catch (error) {
    context.verificationCodes.delete(params.email);
    console.error('[Auth] 邮件发送失败:', error.message);
    throw new Error(`邮件发送失败: ${error.message}`);
  }
}

function getActiveCode(verificationCodes, email) {
  const codeData = verificationCodes.get(email);

  if (!codeData) {
    throw new Error('验证码错误或已过期');
  }

  if (codeData.expiresAt < Date.now()) {
    verificationCodes.delete(email);
    throw new Error('验证码错误或已过期');
  }

  if (codeData.attempts >= MAX_VERIFY_ATTEMPTS) {
    verificationCodes.delete(email);
    throw new Error('验证次数过多，请重新发送验证码');
  }

  return codeData;
}

function recordFailedAttempt(verificationCodes, email, codeData) {
  const attempts = codeData.attempts + 1;

  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    verificationCodes.delete(email);
    throw new Error('验证次数过多，请重新发送验证码');
  }

  verificationCodes.set(email, { ...codeData, attempts });
}

function verifyToken(jwtSecret, token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error('Token 无效或已过期');
  }
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * Creates auth service from environment variables
 * @param {Object} mailer - Mailer instance
 * @returns {Object} Auth service instance
 */
export function createAuthServiceFromEnv(mailer) {
  return createAuthService({
    mailer,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}
