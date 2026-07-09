// Email service implementation
// This is the seam defined in ARCHITECTURE.md
// Production uses Resend with configurable from address via EMAIL_FROM_ADDRESS env var
// Dev always logs activation link as convenience

import { ACTIVATION_BASE_URL, DASHBOARD_URL, isDev } from './config.js';

/**
 * Email service interface (from ARCHITECTURE.md)
 * Production implementation can replace this stub
 */
export interface EmailService {
  sendActivationEmail(email: string, activationToken: string): Promise<void>;
}

/**
 * Production email service using Resend
 * In dev mode, also logs activation link to console for convenience
 */
export class ResendEmailService implements EmailService {
  async sendActivationEmail(email: string, activationToken: string): Promise<void> {
    // For web flow: use activation base URL with token as query parameter
    // The activation link goes to the dashboard where user sets their password
    // In dev: http://localhost:5173/activate?token=act_...
    // In prod: https://schemory.org/activate?token=act_...
    const activationLink = `${ACTIVATION_BASE_URL}?token=${activationToken}`;

    // Dev convenience: always log the full activation link
    if (isDev()) {
      console.log(`[DEV EMAIL] To: ${email}`);
      console.log(`[DEV EMAIL] Activation link: ${activationLink}`);
      console.log(`[DEV EMAIL] Click the link above to activate your account.`);
    }

    // Production: send via Resend
    try {
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        // No API key configured - only log in dev
        if (!isDev()) {
          console.warn('activation email failed to send');
        }
        return;
      }

      // Import Resend dynamically to avoid build issues if not installed
      const { Resend } = await import('resend');

      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || 'noreply@schemory.app',
        to: email,
        subject: 'Activate your Schemory account',
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate your Schemory account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="background: #ffffff; border-radius: 12px; padding: 40px; max-width: 500px; width: 100%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" style="width: 64px; height: 64px;">
        <rect width="100" height="100" rx="20" fill="#FFFFFF"/>
        <!-- Left brace: brand purple -->
        <path d="M32 20 C20 20 16 28 16 36 L16 44 C16 48 11 50 11 50 C11 50 16 52 16 56 L16 64 C16 72 20 80 32 80"
              stroke="#7878F8" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <!-- Equals sign -->
        <line x1="37" y1="42" x2="63" y2="42" stroke="#7878F8" stroke-width="7" stroke-linecap="round"/>
        <line x1="37" y1="58" x2="63" y2="58" stroke="#7878F8" stroke-width="7" stroke-linecap="round"/>
        <!-- Right brace: dark -->
        <path d="M68 20 C80 20 84 28 84 36 L84 44 C84 48 89 50 89 50 C89 50 84 52 84 56 L84 64 C84 72 80 80 68 80"
              stroke="#1A1A2E" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      <h1 style="margin: 16px 0 0 0; color: #1A1A2E; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">schemory</h1>
    </div>
    
    <!-- Content -->
    <div style="text-align: center;">
      <h2 style="color: #1A1A2E; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">Welcome to Schemory</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Click the button below to activate your account and start sharing TypeScript types and JSON schemas with your team.
      </p>
      
      <!-- Activation Button -->
      <a href="${activationLink}" style="display: inline-block; background: #7878F8; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 8px; margin: 24px 0;">
        Activate Account
      </a>
      
      <!-- Link fallback -->
      <p style="color: #888; font-size: 14px; margin: 24px 0 0 0;">
        Or copy this link: <a href="${activationLink}" style="color: #7878F8; text-decoration: none;">${activationLink}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        This is an automated message, please do not reply.
      </p>
      <p style="color: #888; font-size: 12px; margin: 8px 0 0 0;">
        &copy; ${new Date().getFullYear()} Schemory
      </p>
    </div>
  </div>
</body>
</html>`,
        text: `Activate your account by visiting: ${activationLink}`,
      });
    } catch (error) {
      // Never throw - signup must succeed even if email fails
      // Log error details for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!isDev()) {
        console.warn('activation email failed to send:', errorMessage);
      } else {
        console.warn('activation email failed to send:', error);
      }
    }
  }
}

/**
 * Stub implementation for tests - captures tokens instead of sending
 * Used in test environment only
 */
export class StubEmailService implements EmailService {
  capturedEmails: Map<string, string> = new Map();

  async sendActivationEmail(email: string, activationToken: string): Promise<void> {
    this.capturedEmails.set(email, activationToken);
  }

  getActivationToken(email: string): string | undefined {
    return this.capturedEmails.get(email);
  }
}

// Default service: Resend in production, Stub in test
export function createDefaultEmailService(): EmailService {
  if (process.env.NODE_ENV === 'test') {
    return new StubEmailService();
  }
  return new ResendEmailService();
}

// Mutable reference to the email service instance
// This allows dependency injection in tests
let emailServiceInstance: EmailService = createDefaultEmailService();

/**
 * Get the current email service instance
 */
export function getEmailService(): EmailService {
  return emailServiceInstance;
}

/**
 * Set a custom email service (for dependency injection)
 */
export function setEmailService(service: EmailService): void {
  emailServiceInstance = service;
}

// Export a default instance for convenience (deprecated - use getEmailService())
export const emailService: EmailService = emailServiceInstance;
