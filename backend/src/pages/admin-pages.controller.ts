import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequestUser } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../auth/auth.service';
import { PagesService } from './pages.service';
import { SlugParamDto, UpdatePageDto } from './dto/page.dto';

const ctxOf = (req: Request & { user: RequestUser }): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  actorId: req.user.id,
});

/**
 * Admin-only page management: loads and edits ANY user's page from the admin
 * panel (used by the "edit with GUI editor" flow).
 */
@ApiTags('admin/pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get any page by slug (admin editor)' })
  get(@Param() params: SlugParamDto, @Req() req: Request & { user: RequestUser }) {
    return this.pages.getBySlugForAdmin(params.slug, ctxOf(req));
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update any page content by slug (admin editor)' })
  update(
    @Param() params: SlugParamDto,
    @Body() dto: UpdatePageDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.pages.updateBySlugForAdmin(params.slug, dto, ctxOf(req));
  }
}