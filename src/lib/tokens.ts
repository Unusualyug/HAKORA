import { createHash, randomBytes } from 'crypto';

/** Generate an unguessable portal access token (returned once; only its hash is stored). */
export function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url'); // 256 bits of entropy
  return { token, hash: hashAccessToken(token) };
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isValidTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{30,64}$/.test(token);
}
