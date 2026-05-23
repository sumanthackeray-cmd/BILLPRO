import { supabase } from '@/lib/supabase';

/**
 * Email Service
 * Sends transactional emails via Supabase
 */

export const emailService = {
  /**
   * Send email via Supabase Edge Functions
   */
  async sendEmail(to, subject, htmlContent, textContent) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
          },
          body: JSON.stringify({
            to,
            subject,
            html: htmlContent,
            text: textContent
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Email service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[v0] Email send error:', error);
      throw error;
    }
  },

  /**
   * Send verification email template
   */
  async sendVerificationEmail(email, verificationLink) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for registering with EasyBMT. To complete your account setup, please verify your email address.</p>
              <a href="${verificationLink}" class="button">Verify Email</a>
              <p>Or copy this link in your browser: <br><small>${verificationLink}</small></p>
              <p>This link expires in 24 hours.</p>
              <p>If you didn't create this account, please ignore this email.</p>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} EasyBMT. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Verify Your Email

      Thank you for registering with EasyBMT. To complete your account setup, please verify your email address.

      ${verificationLink}

      This link expires in 24 hours.

      If you didn't create this account, please ignore this email.

      © ${new Date().getFullYear()} EasyBMT. All rights reserved.
    `;

    return this.sendEmail(email, 'Verify Your Email - EasyBMT', htmlContent, textContent);
  },

  /**
   * Send password reset email template
   */
  async sendPasswordResetEmail(email, resetLink) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your EasyBMT account.</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p>Or copy this link in your browser: <br><small>${resetLink}</small></p>
              <div class="warning">
                <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.
              </div>
              <p>If you have trouble resetting your password, contact our support team.</p>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} EasyBMT. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Reset Your Password

      We received a request to reset the password for your EasyBMT account.

      ${resetLink}

      This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.

      If you have trouble resetting your password, contact our support team.

      © ${new Date().getFullYear()} EasyBMT. All rights reserved.
    `;

    return this.sendEmail(email, 'Reset Your Password - EasyBMT', htmlContent, textContent);
  },

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, name, companyName) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .features li:before { content: "✓ "; color: #10b981; font-weight: bold; margin-right: 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to EasyBMT!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Welcome to EasyBMT! We're excited to have ${companyName || 'your business'} on board.</p>
              
              <h3>Here's what you can do with EasyBMT:</h3>
              <ul class="features">
                <li>Manage invoices and sales in real-time</li>
                <li>Track inventory across multiple branches</li>
                <li>Generate detailed financial reports</li>
                <li>Handle GST compliance automatically</li>
                <li>Manage team members and permissions</li>
              </ul>
              
              <a href="${window.location.origin}/dashboard" class="button">Get Started</a>
              
              <p>Need help? Check out our <a href="${window.location.origin}/help">help center</a> or contact our support team.</p>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} EasyBMT. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Welcome to EasyBMT!

      Hi ${name},

      Welcome to EasyBMT! We're excited to have ${companyName || 'your business'} on board.

      Here's what you can do with EasyBMT:
      - Manage invoices and sales in real-time
      - Track inventory across multiple branches
      - Generate detailed financial reports
      - Handle GST compliance automatically
      - Manage team members and permissions

      Get started: ${window.location.origin}/dashboard

      Need help? Check out our help center or contact our support team.

      © ${new Date().getFullYear()} EasyBMT. All rights reserved.
    `;

    return this.sendEmail(email, `Welcome to EasyBMT, ${name}!`, htmlContent, textContent);
  }
};

export default emailService;
