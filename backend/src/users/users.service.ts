import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QrService } from '../qr/qr.service';
import { CreateUserDto, QueryUsersDto } from './dto/user.dto';
import { RequestContext } from '../auth/auth.service';

const SAFE_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  isLocked: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  // Each user's public page link (/p/{slug}) so the admin can open/edit it
  pages: { select: { slug: true, title: true, isPublished: true }, take: 1 },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly qr: QrService,
  ) {}

  // ---------------------------------------------------------------
  // Admin dashboard statistics
  // ---------------------------------------------------------------
  async stats() {
    const [totalUsers, totalPages, activeUsers, totalViews, recentLogins] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.page.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.page.aggregate({ _sum: { views: true } }),
      this.prisma.auditLog.count({ where: { action: 'LOGIN_SUCCESS' } }),
    ]);
    return {
      totalUsers,
      activeUsers,
      totalPages,
      totalViews: totalViews._sum.views ?? 0,
      totalLogins: recentLogins,
    };
  }

  // ---------------------------------------------------------------
  // List with search / filter / sort / pagination
  // ---------------------------------------------------------------
  async findAll(query: QueryUsersDto, ctx: RequestContext) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined && query.isActive !== ''
        ? { isActive: String(query.isActive) === 'true' }
        : {}),
    };

    const sortBy = this.allowListSort(query.sortBy ?? 'createdAt');
    const orderBy = { [sortBy]: query.sortOrder ?? 'desc' } as Prisma.UserOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    await this.audit.record({ userId: ctx.actorId, action: 'USERS_LISTED', ip: ctx.ip });
    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /** CSV export of users (used by the admin "Export" button) */
  async exportCsv(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
    };
    const users = await this.prisma.user.findMany({ where, select: SAFE_USER_SELECT, take: 10_000 });
    const header = 'id,username,email,role,isActive,lastLoginAt,createdAt';
    const rows = users.map((u) =>
      [u.id, u.username, u.email ?? '', u.role, u.isActive, u.lastLoginAt ?? '', u.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  // ---------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------
  async create(dto: CreateUserDto, ctx: RequestContext) {
    if (await this.prisma.user.findUnique({ where: { username: dto.username } })) {
      throw new BadRequestException('Username already exists');
    }
    if (dto.email && (await this.prisma.user.findUnique({ where: { email: dto.email } }))) {
      throw new BadRequestException('E-mail already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        role: dto.role ?? Role.USER,
      },
      select: SAFE_USER_SELECT,
    });

    // Optional: create the user's page immediately from the provided slug
    if (dto.pageSlug) {
      if (await this.prisma.page.findUnique({ where: { slug: dto.pageSlug } })) {
        throw new ConflictException('That page slug is already in use.');
      }
      const page = await this.prisma.page.create({
        data: {
          slug: dto.pageSlug,
          title: dto.username,
          content: `# ${dto.username}'s page\n\nThis page was created from the admin panel. Edit it with the page editor.`,
          ownerId: user.id,
          publishedAt: new Date(),
        },
      });
      const qr = await this.qr.generateForUrl(page.slug);
      await this.prisma.page.update({
        where: { id: page.id },
        data: { qrCodePng: qr.pngPath, qrCodeSvg: qr.svgPath },
      });
    }

    await this.audit.record({
      userId: ctx.actorId,
      action: 'USER_CREATED',
      entity: 'user',
      entityId: user.id,
      metadata: { username: user.username, role: user.role },
      ip: ctx.ip,
    });
    return user;
  }

  async setActive(id: string, isActive: boolean, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });
    await this.audit.record({
      userId: ctx.actorId,
      action: isActive ? 'USER_ENABLED' : 'USER_DISABLED',
      entity: 'user',
      entityId: id,
      ip: ctx.ip,
    });
    return updated;
  }

  async resetPassword(id: string, newPassword: string, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.passwordHistory.create({ data: { userId: id, passwordHash } });
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date(), isLocked: false, failedAttempts: 0 },
    });
    await this.audit.record({
      userId: ctx.actorId,
      action: 'USER_PASSWORD_RESET',
      entity: 'user',
      entityId: id,
      ip: ctx.ip,
    });
    return { success: true };
  }

  async remove(id: string, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin account');
      }
    }
    await this.prisma.user.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.actorId,
      action: 'USER_DELETED',
      entity: 'user',
      entityId: id,
      metadata: { username: user.username },
      ip: ctx.ip,
    });
    return { success: true };
  }

  // ---------------------------------------------------------------
  // Recent activity feed for the admin dashboard
  // ---------------------------------------------------------------
  async recentActivity(limit = 10) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { username: true } } },
    });
  }

  private allowListSort(field: string): string {
    const allowed = ['createdAt', 'updatedAt', 'username', 'email', 'role', 'lastLoginAt'];
    return allowed.includes(field) ? field : 'createdAt';
  }
}