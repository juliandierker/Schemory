// Email service stub implementation
// This is the seam defined in ARCHITECTURE.md
// Production implementation can be injected without changing business logic

import crypto from 'crypto';

// Activation link base URL - configurable via environment
const ACTIVATION_BASE_URL = process.env.ACTIVATION_BASE_URL || 'https://api.schemory.app/auth/activate';

/**
 * Email service interface (from ARCHITECTURE.md)
 * Production implementation can replace this stub
 */
export interface EmailService {
  sendActivationEmail(email: string, activationToken: string): Promise<void>;
}

/**
 * Stub implementation - logs activation link to console
 * In production, replace with real email provider (e.g., MailPace for EU)
 */
export class StubEmailService implements EmailService {
  async sendActivationEmail(email: string, activationToken: string): Promise<void> {
    const activationLink = `${ACTIVATION_BASE_URL}/${activationToken}`;
    console.log(`[EMAIL STUB] To: ${email}`);
    console.log(`[EMAIL STUB] Activation link: ${activationLink}`);
    console.log(`[EMAIL STUB] Click the link above to activate your account.`);
    // In a real implementation:
    // await emailProvider.send({ to: email, subject: 'Activate your account', body: activationLink })
  }
}

// Mutable reference to the email service instance
// This allows dependency injection in tests
let emailServiceInstance: EmailService = new StubEmailService();

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
