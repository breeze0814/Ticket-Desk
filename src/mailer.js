import nodemailer from 'nodemailer';

/**
 * Creates a mailer instance with the given SMTP configuration
 * @param {Object} config - SMTP configuration
 * @param {string} config.host - SMTP host
 * @param {number} config.port - SMTP port
 * @param {boolean} [config.secure] - Use TLS (defaults to true for port 465)
 * @param {string} config.user - SMTP username
 * @param {string} config.pass - SMTP password
 * @param {string} config.from - Default sender email address
 * @param {Function} [config.sendMail] - Custom sendMail function for testing
 * @returns {Object} Mailer instance with sendVerificationCode method
 */
export function createMailer(config) {
  if (!config || !config.host || !config.port || !config.user || !config.pass || !config.from) {
    throw new Error('SMTP 配置不完整');
  }

  const transporter = config.sendMail ? { sendMail: config.sendMail } : nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure !== undefined ? config.secure : config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const mailer = {
    /**
     * Sends a verification code email
     * @param {string} email - Recipient email address
     * @param {string} code - Verification code
     * @returns {Promise<boolean>} True if sent successfully
     */
    async sendVerificationCode(email, code) {
      try {
        await transporter.sendMail({
          from: config.from,
          to: email,
          subject: '验证码',
          text: `您的验证码是：${code}

此验证码将在 3 分钟后过期，请尽快使用。

如果这不是您的操作，请忽略此邮件。

—— 工单系统`
        });
        return true;
      } catch (error) {
        console.error('Failed to send verification code email:', error);
        throw new Error('验证码发送失败');
      }
    }
  };

  return mailer;
}

/**
 * Creates a mailer instance from environment variables
 * @returns {Object} Mailer instance
 */
export function createMailerFromEnv() {
  const port = parseInt(process.env.SMTP_PORT, 10);

  return createMailer({
    host: process.env.SMTP_HOST,
    port,
    secure: parseSmtpSecure(process.env.SMTP_SECURE, port),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  });
}

function parseSmtpSecure(value, port) {
  if (value === undefined) {
    return port === 465;
  }

  return value === 'true';
}
