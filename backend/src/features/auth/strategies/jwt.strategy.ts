import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    const secret = config.get<string>('supabase.jwtSecret');
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET is not set. Check your .env file.');
    }

    const logger = new Logger(JwtStrategy.name);

    super({
      jwtFromRequest: (req: Request) => {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (token) {
          try {
            const header = JSON.parse(
              Buffer.from(token.split('.')[0], 'base64url').toString(),
            );
            logger.debug(`JWT header: ${JSON.stringify(header)}`);
          } catch {
            logger.warn('Could not decode JWT header');
          }
        } else {
          logger.warn('No Bearer token found in Authorization header');
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: Record<string, unknown>) {
    if (!payload?.sub) {
      this.logger.warn('JWT rejected: missing sub claim');
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, email: payload.email };
  }
}
