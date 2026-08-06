import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { AuditService } from '../audit/audit.service';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';
import { RequestContext } from '../auth/auth.service';

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
    private readonly audit: AuditService,
  ) {}

  /** User: get own page with its QR/public URL */
  async getMyPage(userId: string, ctx: RequestContext) {
    const page = await this.prisma.page.findFirst({ where: { ownerId: userId } });
    if (!page) return null;
    await this.audit.record({ userId, action: 'PAGE_READ', entity: 'page', entityId: page.id, ip: ctx.ip });
    return page;
  }

  /** User: create own page (one per user) and generate QR */
  async createMyPage(userId: string, dto: CreatePageDto, ctx: RequestContext) {
    const existing = await this.prisma.page.findFirst({ where: { ownerId: userId } });
    if (existing) {
      throw new ConflictException('You already have a page. Update it instead.');
    }
    if (await this.slugTaken(dto.slug)) {
      throw new ConflictException('That slug is already in use.');
    }
    const page = await this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        seoTitle: dto.seoTitle,
        description: dto.description,
        ownerId: userId,
        publishedAt: new Date(),
      },
    });
    // Generate QR asynchronously but await to guarantee availability in the response
    const qr = await this.qr.generateForUrl(page.slug);
    await this.prisma.page.update({
      where: { id: page.id },
      data: { qrCodePng: qr.pngPath, qrCodeSvg: qr.svgPath },
    });
    await this.audit.record({ userId, action: 'PAGE_CREATED', entity: 'page', entityId: page.id, ip: ctx.ip });
    return this.getMyPage(userId, ctx);
  }

  async updateMyPage(userId: string, dto: UpdatePageDto, ctx: RequestContext) {
    const page = await this.prisma.page.findFirst({ where: { ownerId: userId } });
    if (!page) throw new NotFoundException('Page not found');
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: {
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished,
        seoTitle: dto.seoTitle,
        description: dto.description,
      },
    });
    await this.audit.record({ userId, action: 'PAGE_UPDATED', entity: 'page', entityId: page.id, ip: ctx.ip });
    return updated;
  }

  /** Admin: fetch any page by slug (for editing from the admin panel) */
  async getBySlugForAdmin(slug: string, ctx: RequestContext) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { owner: { select: { username: true, email: true } } },
    });
    if (!page) throw new NotFoundException('Page not found');
    await this.audit.record({
      userId: ctx.actorId,
      action: 'PAGE_READ_ADMIN',
      entity: 'page',
      entityId: page.id,
      metadata: { slug: page.slug },
      ip: ctx.ip,
    });
    return page;
  }

  /** Admin: edit any page's content (title, content, SEO, publish state, slug) */
  async updateBySlugForAdmin(slug: string, dto: UpdatePageDto, ctx: RequestContext) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');

    // Slug (public URL) can be renamed — enforce uniqueness if it changed
    const newSlug = dto.slug && dto.slug !== page.slug ? dto.slug : undefined;
    if (newSlug && (await this.prisma.page.findUnique({ where: { slug: newSlug } }))) {
      throw new ConflictException('That page slug is already in use.');
    }

    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: {
        slug: newSlug,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished,
        seoTitle: dto.seoTitle,
        description: dto.description,
      },
      include: { owner: { select: { username: true, email: true } } },
    });

    // Regenerate the QR code since the encoded public URL changed
    if (newSlug) {
      const qr = await this.qr.generateForUrl(newSlug);
      await this.prisma.page.update({
        where: { id: page.id },
        data: { qrCodePng: qr.pngPath, qrCodeSvg: qr.svgPath },
      });
    }

    await this.audit.record({
      userId: ctx.actorId,
      action: 'PAGE_UPDATED_BY_ADMIN',
      entity: 'page',
      entityId: page.id,
      metadata: { slug: updated.slug, title: updated.title },
      ip: ctx.ip,
    });
    return updated;
  }

  /** Public route: render a published, public page without auth */
  async getPublicPage(slug: string, ctx: RequestContext) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.isPublished) {
      throw new NotFoundException('Page not found');
    }
    // Views counter (best-effort, non-blocking check)
    await this.prisma.page.updateMany({ where: { id: page.id }, data: { views: { increment: 1 } } });
    return {
      slug: page.slug,
      title: page.title,
      content: page.content,
      seoTitle: page.seoTitle,
      description: page.description,
      updatedAt: page.updatedAt,
    };
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.page.findUnique({ where: { slug } })) !== null;
  }
}