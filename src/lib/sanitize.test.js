// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize.js';

describe('sanitizeHtml', () => {
    it('removes script tags', () => {
        const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>Hello</p>');
    });
    it('removes style tags', () => {
        const result = sanitizeHtml('<style>body{display:none}</style><p>text</p>');
        expect(result).not.toContain('<style>');
        expect(result).toContain('<p>text</p>');
    });
    it('removes onerror attributes', () => {
        const result = sanitizeHtml('<img onerror="alert(1)" src="x.png">');
        expect(result).not.toContain('onerror');
    });
    it('removes onclick attributes', () => {
        const result = sanitizeHtml('<div onclick="evil()">text</div>');
        expect(result).not.toContain('onclick');
    });
    it('removes onmouseover attributes', () => {
        const result = sanitizeHtml('<p onmouseover="evil()">text</p>');
        expect(result).not.toContain('onmouseover');
    });
    it('removes javascript: href values', () => {
        const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
        expect(result).not.toContain('javascript:');
    });
    it('preserves safe paragraph HTML', () => {
        const input = '<p>Hello <strong>world</strong></p>';
        expect(sanitizeHtml(input)).toBe(input);
    });
    it('preserves safe links', () => {
        const result = sanitizeHtml('<a href="https://example.com">link</a>');
        expect(result).toContain('href="https://example.com"');
    });
    it('handles empty string', () => {
        expect(sanitizeHtml('')).toBe('');
    });
});
