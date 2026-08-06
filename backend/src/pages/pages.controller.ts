import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequestUser } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestContext } from '../auth/auth.service';
import { Public } from '../common/decorators/public.decorator';
import { PagesService } from './pages.service';
import { CreatePageDto, SlugParamDto, UpdatePageDto } from './dto/page.dto';

const ctxOf = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

@ApiTags('pages')
@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  // ---------------------------------------------------------------
  // User dashboard endpoints
  // ---------------------------------------------------------------
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('pages/me')
  @ApiOperation({ summary: 'Get my page (with QR paths)' })
  getMyPage(@Req() req: Request & { user: RequestUser }) {
    return this.pages.getMyPage(req.user.id, ctxOf(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('pages/me')
  @ApiOperation({ summary: 'Create my page (one per user) + generate QR' })
  createMyPage(@Req() req: Request & { user: RequestUser }, @Body() dto: CreatePageDto) {
    return this.pages.createMyPage(req.user.id, dto, ctxOf(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('pages/me')
  @ApiOperation({ summary: 'Update my page' })
  updateMyPage(@Req() req: Request & { user: RequestUser }, @Body() dto: UpdatePageDto) {
    return this.pages.updateMyPage(req.user.id, dto, ctxOf(req));
  }

  // ---------------------------------------------------------------
  // Public page — no authentication required
  // ---------------------------------------------------------------
  @Public()
  @Get('p/:slug')
  @ApiOperation({ summary: 'Public page by slug (no auth)' })
  getPublicPage(@Param() params: SlugParamDto, @Req() req: Request) {
    return this.pages.getPublicPage(params.slug, ctxOf(req));
  }
}