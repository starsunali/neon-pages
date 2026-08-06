import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestUser } from '../common/guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { AuthService, RequestContext } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

const ctxOf = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login with username + password + captcha' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    // NOTE: `dto.captcha` is validated (4-6 alphanumerics). To enable a real
    // CAPTCHA provider, replace the check below with a reCAPTCHA/hCaptcha
    // server-side verification call.
    if (dto.captcha.length < 4) {
      return { statusCode: 400, message: 'Invalid captcha' };
    }
    return this.auth.login(dto, ctxOf(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @ApiOperation({ summary: 'Rotate refresh token, get new access + refresh pair' })
  async refresh(@Req() req: Request & { user: { id: string; jti: string } }) {
    return this.auth.refresh(req.user, ctxOf(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout — revoke the current refresh token' })
  async logout(@Req() req: Request & { user: RequestUser; refreshJti?: string }) {
    return this.auth.logout(req.user.id, req.refreshJti, ctxOf(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@Req() req: Request & { user: RequestUser }) {
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'USER')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({ summary: 'Change own password (invalidates all sessions)' })
  changePassword(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.user.id, dto, ctxOf(req));
  }
}