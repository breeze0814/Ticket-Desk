import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';
import { createMailer, createMailerFromEnv } from '../src/mailer.js';

describe('Mailer', () => {
  describe('createMailer', () => {
    it('throws error when SMTP config is missing', () => {
      expect(() => createMailer({})).toThrow('SMTP 配置不完整');
      expect(() => createMailer({ host: 'smtp.example.com' })).toThrow('SMTP 配置不完整');
      expect(() => createMailer({ host: 'smtp.example.com', port: 587 })).toThrow('SMTP 配置不完整');
      expect(() => createMailer({ host: 'smtp.example.com', port: 587, user: 'test@example.com' })).toThrow('SMTP 配置不完整');
      expect(() => createMailer({ host: 'smtp.example.com', port: 587, user: 'test@example.com', pass: 'password' })).toThrow('SMTP 配置不完整');
    });

    it('sends verification code email successfully', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });

      const mailer = createMailer({
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        pass: 'password',
        from: 'noreply@example.com',
        sendMail: mockSendMail
      });

      const result = await mailer.sendVerificationCode('user@example.com', '123456');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: '验证码',
        text: expect.stringContaining('123456')
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('此验证码将在 3 分钟后过期')
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('如果这不是您的操作，请忽略此邮件')
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('—— 工单系统')
        })
      );
    });

    it('handles email sending failure', async () => {
      const mockSendMail = vi.fn().mockRejectedValue(new Error('SMTP connection failed'));

      const mailer = createMailer({
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        pass: 'password',
        from: 'noreply@example.com',
        sendMail: mockSendMail
      });

      await expect(mailer.sendVerificationCode('user@example.com', '123456'))
        .rejects.toThrow('验证码发送失败');
    });
  });

  describe('createMailerFromEnv', () => {
    beforeEach(() => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_FROM;
    });

    it('creates mailer from environment variables', () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_SECURE = 'false';
      process.env.SMTP_USER = 'test@gmail.com';
      process.env.SMTP_PASS = 'app-password';
      process.env.SMTP_FROM = 'noreply@gmail.com';

      const mailer = createMailerFromEnv();

      expect(mailer).toBeDefined();
      expect(mailer.sendVerificationCode).toBeInstanceOf(Function);
    });

    it('uses TLS by default for SMTP port 465 when SMTP_SECURE is unset', () => {
      const createTransport = vi.spyOn(nodemailer, 'createTransport')
        .mockReturnValue({ sendMail: vi.fn() });

      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'password';
      process.env.SMTP_FROM = 'noreply@example.com';

      createMailerFromEnv();

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true }),
      );
      createTransport.mockRestore();
    });

    it('throws error when environment variables are missing', () => {
      expect(() => createMailerFromEnv()).toThrow('SMTP 配置不完整');
    });
  });
});
