// Email service implementation
// This is the seam defined in ARCHITECTURE.md
// Production uses Resend; dev always logs activation link as convenience

import { ACTIVATION_BASE_URL, isDev } from './config.js';

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
    const activationLink = `${ACTIVATION_BASE_URL}/${activationToken}`;

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
        from: 'noreply@schemory.app',
        to: email,
        subject: 'Activate your Schemory account',
        html: `<p>Click <a href="${activationLink}">here</a> to activate your account.</p>`,
        text: `Activate your account by visiting: ${activationLink}`,
      });
    } catch (error) {
      // Never throw - signup must succeed even if email fails
      // In production, log only generic message (NO token/link)
      if (!isDev()) {
        console.warn('activation email failed to send');
      }
      // In dev, the link was already logged above, so we can show the error too
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
