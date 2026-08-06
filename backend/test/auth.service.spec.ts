import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loginAttempt: { create: jest.fn() },
    refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    passwordHistory: { findMany: jest.fn(), create: jest.fn() },
  };
  const config = new ConfigService();
  const jwt = new JwtService();
  const audit = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: JwtService, useValue: jwt },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects an unknown user with an UnauthorizedException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ username: 'ghost', password: 'WrongPass1!', captcha: 'ABCD' }),
    ).rejects.toThrow('Invalid username or password');
    expect(prisma.loginAttempt.create).toHaveBeenCalled();
  });

  it('rejects an invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRkYXRhc29tZXNhbHQ$NklkZ1BHQmVNWE1ZemdaTW0yTmcrS0tWQTFNRVZRSE4',
      isActive: true,
      isLocked: false,
      lockUntil: null,
      failedAttempts: 0,
    });
    await expect(
      service.login({ username: 'demo', password: 'WrongPass1!', captcha: 'ABCD' }),
    ).rejects.toThrow();
  });

  it('rejects passwords that do not match their confirmation', async () => {
    await expect(
      service.changePassword('u1', {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmPassword: 'Different1!',
      }),
    ).rejects.toThrow('do not match');
  });
});