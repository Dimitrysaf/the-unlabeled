import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateDisplayName } from './validation.js';

describe('validateEmail', () => {
    it('accepts a valid email', () => {
        expect(validateEmail('user@example.com')).toBe('');
    });
    it('trims whitespace before validating', () => {
        expect(validateEmail('  user@example.com  ')).toBe('');
    });
    it('rejects empty string', () => {
        expect(validateEmail('')).not.toBe('');
    });
    it('rejects null', () => {
        expect(validateEmail(null)).not.toBe('');
    });
    it('rejects undefined', () => {
        expect(validateEmail(undefined)).not.toBe('');
    });
    it('rejects missing @', () => {
        expect(validateEmail('notanemail')).not.toBe('');
    });
    it('rejects missing domain', () => {
        expect(validateEmail('user@')).not.toBe('');
    });
    it('rejects missing TLD', () => {
        expect(validateEmail('user@domain')).not.toBe('');
    });
    it('rejects spaces in address', () => {
        expect(validateEmail('user @example.com')).not.toBe('');
    });
});

describe('validatePassword', () => {
    it('accepts a strong password', () => {
        expect(validatePassword('Passw0rd!')).toBe(''); // pragma: allowlist secret
    });
    it('rejects empty', () => {
        expect(validatePassword('')).not.toBe('');
    });
    it('rejects null', () => {
        expect(validatePassword(null)).not.toBe('');
    });
    it('rejects too short (< 8 chars)', () => {
        expect(validatePassword('Ab1!')).not.toBe(''); // pragma: allowlist secret
    });
    it('rejects missing uppercase', () => {
        expect(validatePassword('passw0rd!')).not.toBe(''); // pragma: allowlist secret
    });
    it('rejects missing lowercase', () => {
        expect(validatePassword('PASSW0RD!')).not.toBe(''); // pragma: allowlist secret
    });
    it('rejects missing digit', () => {
        expect(validatePassword('Password!')).not.toBe(''); // pragma: allowlist secret
    });
    it('rejects missing special character', () => {
        expect(validatePassword('Passw0rd')).not.toBe(''); // pragma: allowlist secret
    });
});

describe('validateDisplayName', () => {
    it('accepts a valid name', () => {
        expect(validateDisplayName('JohnDoe')).toBe('');
    });
    it('accepts names with spaces, dots, underscores and hyphens', () => {
        expect(validateDisplayName('John Doe.')).toBe('');
        expect(validateDisplayName('j_doe-1')).toBe('');
    });
    it('trims whitespace before validating', () => {
        expect(validateDisplayName('  JohnDoe  ')).toBe('');
    });
    it('rejects empty string', () => {
        expect(validateDisplayName('')).not.toBe('');
    });
    it('rejects null', () => {
        expect(validateDisplayName(null)).not.toBe('');
    });
    it('rejects names with HTML characters', () => {
        expect(validateDisplayName('User<script>')).not.toBe('');
    });
    it('rejects single character names', () => {
        expect(validateDisplayName('J')).not.toBe('');
    });
    it('rejects names longer than 50 chars', () => {
        expect(validateDisplayName('a'.repeat(55))).not.toBe('');
    });
});
