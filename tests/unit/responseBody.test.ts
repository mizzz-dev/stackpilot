import { describe, expect, it } from 'vitest';
import {
  createSafeResponseBodyPreview,
  createUnavailableResponseBodyPreview,
  formatResponseBodyUnavailableReason,
  isSupportedResponseBodyContentType,
  maxCapturedResponseBodyBytes
} from '../../shared/domain/responseBody';

describe('response body', () => {
  it('JSON系Content-Typeだけを許可する', () => {
    expect(isSupportedResponseBodyContentType('application/json')).toBe(true);
    expect(isSupportedResponseBodyContentType('application/problem+json; charset=utf-8')).toBe(true);
    expect(isSupportedResponseBodyContentType('text/plain')).toBe(false);
    expect(isSupportedResponseBodyContentType('text/html')).toBe(false);
    expect(isSupportedResponseBodyContentType()).toBe(false);
  });

  it('ネストしたJSONの機密項目を再帰的にマスキングする', () => {
    const rawBody = JSON.stringify({
      id: 1,
      profile: {
        name: 'Mizzz',
        access_token: 'secret-token'
      },
      sessions: [
        { sessionId: 'secret-session', enabled: true },
        { password: 'secret-password' }
      ]
    });
    const preview = createSafeResponseBodyPreview({
      contentType: 'application/json',
      rawBody,
      byteLength: Buffer.byteLength(rawBody)
    });

    expect(preview).toMatchObject({
      kind: 'json',
      contentType: 'application/json',
      isTruncated: false,
      redactedFieldPaths: [
        'profile.access_token',
        'sessions[0].sessionId',
        'sessions[1].password'
      ]
    });
    expect(preview?.content).toContain('"access_token":"<redacted>"');
    expect(preview?.content).toContain('"sessionId":"<redacted>"');
    expect(preview?.content).not.toContain('secret-token');
    expect(preview?.content).not.toContain('secret-session');
    expect(preview?.content).not.toContain('secret-password');
  });

  it('64KiBを超えるbodyは内容を保持しない', () => {
    const preview = createSafeResponseBodyPreview({
      contentType: 'application/json',
      rawBody: JSON.stringify({ value: 'x'.repeat(maxCapturedResponseBodyBytes) }),
      byteLength: maxCapturedResponseBodyBytes + 1
    });

    expect(preview).toEqual({
      kind: 'unavailable',
      contentType: 'application/json',
      byteLength: maxCapturedResponseBodyBytes + 1,
      isTruncated: true,
      redactedFieldPaths: [],
      unavailableReason: 'body-too-large'
    });
    expect(preview?.content).toBeUndefined();
  });

  it('対象外Content-Typeと不正JSONをraw表示しない', () => {
    const text = createSafeResponseBodyPreview({
      contentType: 'text/plain',
      rawBody: 'password=secret',
      byteLength: 15
    });
    const invalidJson = createSafeResponseBodyPreview({
      contentType: 'application/json',
      rawBody: '{"password":"secret"',
      byteLength: 20
    });

    expect(text?.unavailableReason).toBe('unsupported-content-type');
    expect(text?.content).toBeUndefined();
    expect(invalidJson?.unavailableReason).toBe('invalid-json');
    expect(invalidJson?.content).toBeUndefined();
  });

  it('DevTools起動中などの取得不可理由を表現できる', () => {
    const preview = createUnavailableResponseBodyPreview('devtools-open');

    expect(preview.kind).toBe('unavailable');
    expect(preview.byteLength).toBe(0);
    expect(formatResponseBodyUnavailableReason(preview.unavailableReason)).toContain('DevTools');
  });
});
