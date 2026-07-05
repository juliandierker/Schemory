// Unit tests for email service
// Tests the gating conditions and logging behavior

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Track console output
const originalLog = console.log;
const originalWarn = console.warn;
let logMessages: string[] = [];
let warnMessages: string[] = [];

function setupConsoleCapture() {
  logMessages = [];
  warnMessages = [];
  console.log = vi.fn((...args: unknown[]) => {
    logMessages.push(args.map(a => String(a)).join(' '));
    originalLog(...args);
  });
  console.warn = vi.fn((...args: unknown[]) => {
    warnMessages.push(args.map(a => String(a)).join(' '));
    originalWarn(...args);
  });
}

function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
}

// Helper to check if any message contains a substring
function hasInOutput(substring: string): boolean {
  return [...logMessages, ...warnMessages].some(msg => msg.includes(substring));
}

// Helper to get all output as a single string
function getAllOutput(): string {
  return [...logMessages, ...warnMessages].join(' ');
}

describe('email service', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    setupConsoleCapture();
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    restoreConsole();
    vi.restoreAllMocks();
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('config', () => {
    it('isDev returns true when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      const { isDev } = await import('../src/config.js');
      expect(isDev()).toBe(true);
    });

    it('isDev returns false when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      const { isDev } = await import('../src/config.js');
      expect(isDev()).toBe(false);
    });
  });

  describe('ResendEmailService logging behavior', () => {
    it('logs activation link in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const { ResendEmailService } = await import('../src/email.js');
      
      const emailService = new ResendEmailService();
      await emailService.sendActivationEmail('test@example.com', 'act_devtoken123');

      // Should have logged the activation link in dev
      expect(hasInOutput('act_devtoken123')).toBe(true);
    });

    it('does NOT log activation link in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const { ResendEmailService } = await import('../src/email.js');
      
      const emailService = new ResendEmailService();
      await emailService.sendActivationEmail('test@example.com', 'act_prodtoken456');

      // Should NOT have logged the activation link in production
      expect(hasInOutput('act_prodtoken456')).toBe(false);
      expect(hasInOutput('Activation link')).toBe(false);
    });

    it('logs generic warning in production when Resend fails', async () => {
      process.env.NODE_ENV = 'production';
      const { ResendEmailService } = await import('../src/email.js');
      
      const emailService = new ResendEmailService();
      await emailService.sendActivationEmail('test@example.com', 'act_prodtoken789');

      // Should have logged generic warning
      expect(warnMessages.some(m => m.includes('activation email failed to send'))).toBe(true);
      
      // Generic warning must NOT contain token or link
      expect(getAllOutput()).not.toContain('act_prodtoken789');
      expect(getAllOutput()).not.toContain('auth/activate');
    });
  });

  describe('StubEmailService', () => {
    it('captures activation tokens for test use', async () => {
      process.env.NODE_ENV = 'test';
      const { StubEmailService } = await import('../src/email.js');
      const stub = new StubEmailService();
      
      await stub.sendActivationEmail('test@example.com', 'act_test123');
      
      expect(stub.getActivationToken('test@example.com')).toBe('act_test123');
      expect(stub.getActivationToken('other@example.com')).toBeUndefined();
    });
  });
});
