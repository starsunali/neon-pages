import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

export interface RefreshPayload {
  sub: string;
  jti: string;
  username: string;
  role: string;
  type: 'refresh';
}

// Extract the refresh token from the Authorization: Bearer <refresh> header,
// or from the `rt` httpOnly cookie when present.
const extractFromHttpOnlyCookie = (req: Request): string | null => {
  const cookie = req.cookies?.['rt'] ?? req.headers['cookie'];
  if (!cookie) return null;
  const match = String(cookie).match(/(?:^|;\s*)rt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => extractFromHttpOnlyCookie(req),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: config.get<string>('jwt.refreshSecret') ?? 'dev-refresh-secret',
    });
  }

  validate(_req: Request, payload: RefreshPayload) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { id: payload.sub, jti: payload.jti, username: payload.username, role: payload.role };
  }
}