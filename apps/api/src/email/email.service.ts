import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Environment } from '../config/environment';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService<Environment, true>) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: {
        user: config.get('SMTP_USER', { infer: true }),
        pass: config.get('SMTP_PASSWORD', { infer: true }),
      },
      pool: true,
      maxConnections: 3,
    });
  }

  async sendVerification(email: string, token: string): Promise<void> {
    const url = new URL('/verify-email', this.config.get('ADMIN_WEB_URL', { infer: true }));
    url.searchParams.set('token', token);
    await this.send(
      email,
      'Verify your email address',
      `Open this secure link to verify your account: ${url.toString()}\n\nThe link expires in 24 hours.`,
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = new URL('/reset-password', this.config.get('ADMIN_WEB_URL', { infer: true }));
    url.searchParams.set('token', token);
    await this.send(
      email,
      'Reset your password',
      `Open this secure link to reset your password: ${url.toString()}\n\nThe link expires in one hour. Ignore this message if you did not request it.`,
    );
  }

  async sendInvitation(email: string, token: string): Promise<void> {
    const url = new URL('/accept-invitation', this.config.get('ADMIN_WEB_URL', { infer: true }));
    url.searchParams.set('token', token);
    await this.send(
      email,
      'You have been invited',
      `Open this secure link to review the invitation: ${url.toString()}\n\nThe link expires automatically.`,
    );
  }

  async verifyConnection(): Promise<boolean> {
    try {
      return await this.transporter.verify();
    } catch {
      return false;
    }
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', { infer: true }),
      to,
      subject,
      text,
    });
  }
}
