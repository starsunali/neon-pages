import { createHash } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  /** The acting authenticated user, for audit attribution (e.g. an admin). */
  actorId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------
  // LOGIN — validate, brute-force protect, issue access + refresh
  // ---------------------------------------------------------------
  async login(dto: LoginDto, ctx: RequestContext = {}) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });

    // Run a hash verification regardless so the timing is near-constant.
    const storedHash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2.verify(storedHash, dto.password);

    if (!user || !valid) {
      await this.recordFailure(user?.id, dto.username, ctx);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      await this.audit.record({ userId: user.id, action: 'LOGIN_BLOCKED_DISABLED', ip: ctx.ip });
      throw new ForbiddenException('Account is disabled. Contact an administrator.');
    }
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException(
        `Account is locked until ${user.lockUntil.toISOString()}. Try again later.`,
      );
    }

    // Clear any expired lock state and failure counters
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, isLocked: false, lockUntil: null, lastLoginAt: new Date() },
    });
    await this.prisma.loginAttempt.create({
      data: { username: dto.username, ip: ctx.ip, userAgent: ctx.userAgent, success: true },
    });
    await this.audit.record({ userId: user.id, action: 'LOGIN_SUCCESS', ip: ctx.ip, userAgent: ctx.userAgent });

    return this.issueTokens(user);
  }

  // ---------------------------------------------------------------
  // REFRESH — rotate (revoke old, issue new pair)
  // ---------------------------------------------------------------
  async refresh(user: { id: string; jti: string }, ctx: RequestContext = {}) {
    const old = await this.prisma.refreshToken.findUnique({ where: { jti: user.jti } });
    if (!old || old.revokedAt) {
      throw new UnauthorizedException('Refresh token is invalid or has been revoked');
    }
    if (old.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    if (old.userId !== user.id) {
      throw new UnauthorizedException('Refresh token does not match the active session');
    }

    // Rotate
    const newJti = randomUUID();
    await this.prisma.refreshToken.update({
      where: { id: old.id },
      data: { revokedAt: new Date(), replacedBy: newJti },
    });
    await this.prisma.refreshToken.create({
      data: {
        jti: newJti,
        userId: user.id,
        tokenHash: this.hashToken(newJti),
        expiresAt: this.addMinutes(new Date(), this.refreshTtlMinutes()),
      },
    });

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new UnauthorizedException();
    await this.audit.record({ userId: dbUser.id, action: 'TOKEN_REFRESH', ip: ctx.ip, userAgent: ctx.userAgent });
    return this.buildTokens(dbUser, newJti);
  }

  async logout(userId: string, jti?: string, ctx: RequestContext = {}) {
    if (jti) {
      await this.prisma.refreshToken.updateMany({
        where: { jti, userId },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.record({ userId, action: 'LOGOUT', ip: ctx.ip, userAgent: ctx.userAgent });
    return { success: true };
  }

  // ---------------------------------------------------------------
  // CHANGE PASSWORD — verify, prevent reuse, invalidate sessions
  // ---------------------------------------------------------------
  async changePassword(userId: string, dto: ChangePasswordDto, ctx: RequestContext = {}) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ConflictException('New password and confirmation do not match');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account not found');

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      await this.audit.record({ userId, action: 'PASSWORD_CHANGE_FAILED', ip: ctx.ip });
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Password reuse prevention (last 5)
    const recent = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const h of recent) {
      if (await argon2.verify(h.passwordHash, dto.newPassword)) {
        throw new ConflictException('This password was used recently. Choose a different one.');
      }
    }

    const newHash = await this.hashPassword(dto.newPassword);
    await this.prisma.passwordHistory.create({ data: { userId, passwordHash: newHash } });
    // Invalidate all sessions
    await this.prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    });
    await this.audit.record({ userId, action: 'PASSWORD_CHANGED', ip: ctx.ip, userAgent: ctx.userAgent });
    return { success: true };
  }

  // ---------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------
  private async recordFailure(userId: string | undefined, username: string, ctx: RequestContext) {
    await this.prisma.loginAttempt.create({
      data: { username, ip: ctx.ip, userAgent: ctx.userAgent, success: false },
    });
    await this.audit.record({ userId, action: 'LOGIN_FAILED', ip: ctx.ip, userAgent: ctx.userAgent });
    if (!userId) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const attempts = user.failedAttempts + 1;
    const threshold = this.config.get<number>('lock.threshold') ?? 5;

    if (attempts >= threshold) {
      const minutes = this.config.get<number>('lock.minutes') ?? 15;
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedAttempts: attempts, isLocked: true, lockUntil: this.addMinutes(new Date(), minutes) },
      });
      await this.audit.record({ userId, action: 'ACCOUNT_LOCKED', ip: ctx.ip });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedAttempts: attempts },
      });
    }
  }

  private async issueTokens(user: User) {
    const jti = randomUUID();
    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId: user.id,
        tokenHash: this.hashToken(jti),
        expiresAt: this.addMinutes(new Date(), this.refreshTtlMinutes()),
      },
    });
    return this.buildTokens(user, jti);
  }

  private async buildTokens(user: User, jti: string) {
    const accessToken = await this.jwt.signAsync(
      { username: user.username, role: user.role, type: 'access' },
      {
        subject: user.id,
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { jti, username: user.username, role: user.role, type: 'refresh' },
      {
        subject: user.id,
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashPassword(pw: string): Promise<string> {
    return argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  }

  private refreshTtlMinutes(): number {
    return 60 * 24 * 7;
  }

  private addMinutes(now: Date, minutes: number): Date {
    return new Date(now.getTime() + minutes * 60_000);
  }
}

// A valid-format Argon2 hash so failed logins cost a real hash verify (timing safety).
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRkYXRhc29tZXNhbHQ$NklkZ1BHQmVNWE1ZemdaTW0yTmcrS0tWQTFNRVZRSE4';