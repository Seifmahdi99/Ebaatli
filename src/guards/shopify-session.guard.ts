import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Validates Shopify App Bridge session tokens (HS256 JWTs) sent by the
 * embedded app frontend via the  Authorization: Bearer <token>  header.
 *
 * If no Authorization header is present the request is allowed through so
 * that non-embedded clients (merchant portal, admin panel) continue to work.
 * When a token IS provided it must be valid or the request is rejected 401.
 */
@Injectable()
export class ShopifySessionGuard implements CanActivate {
  private readonly logger = new Logger(ShopifySessionGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];

    // No token — allow through (merchant portal, admin panel, etc.)
    if (!authHeader) return true;

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Malformed Authorization header');
    }

    const token = authHeader.slice(7);
    const apiSecret = this.config.get<string>('SHOPIFY_API_SECRET') ?? '';

    try {
      const payload = this.verifySessionToken(token, apiSecret);
      // Attach the verified shop domain to the request for downstream use
      req.shopDomain = new URL(payload.dest as string).hostname;
      return true;
    } catch (err: any) {
      this.logger.warn(`Rejected session token: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired session token');
    }
  }

  /**
   * Verifies a Shopify session token (HS256 JWT signed with the app secret).
   * Returns the decoded payload on success, throws on failure.
   */
  private verifySessionToken(token: string, secret: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Not a valid JWT');

    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (expectedSig !== signature) throw new Error('Signature mismatch');

    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    const now = Math.floor(Date.now() / 1000);
    if (typeof decoded.exp === 'number' && decoded.exp < now) {
      throw new Error('Token expired');
    }

    return decoded;
  }
}
