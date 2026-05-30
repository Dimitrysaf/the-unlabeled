import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeAttr } from './escape.js';

describe('escapeHtml', () => {
    it('escapes ampersands', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });
    it('escapes angle brackets', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });
    it('escapes double quotes', () => {
        expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });
    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe('it&#39;s');
    });
    it('handles null', () => {
        expect(escapeHtml(null)).toBe('');
    });
    it('handles undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
    });
    it('handles numbers', () => {
        expect(escapeHtml(42)).toBe('42');
    });
    it('leaves safe strings unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
    it('blocks XSS via script tag', () => {
        const xss = '<script>alert("xss")</script>';
        expect(escapeHtml(xss)).not.toContain('<script>');
    });
});

describe('escapeAttr', () => {
    it('escapes ampersands', () => {
        expect(escapeAttr('a & b')).toBe('a &amp; b');
    });
    it('escapes double quotes', () => {
        expect(escapeAttr('"value"')).toBe('&quot;value&quot;');
    });
    it('handles null', () => {
        expect(escapeAttr(null)).toBe('');
    });
    it('handles undefined', () => {
        expect(escapeAttr(undefined)).toBe('');
    });
    it('leaves angle brackets unchanged (not needed in attributes)', () => {
        expect(escapeAttr('<foo>')).toBe('<foo>');
    });
});
