import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequestUser } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../auth/auth.service';
import { UsersService } from './users.service';
import { CreateUserDto, QueryUsersDto } from './dto/user.dto';

const ctxOf = (req: Request & { user: RequestUser }): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  actorId: req.user.id,
});

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  stats() {
    return this.users.stats();
  }

  @Get()
  @ApiOperation({ summary: 'List users (search / filter / sort / pagination)' })
  findAll(@Query() query: QueryUsersDto, @Req() req: Request & { user: RequestUser }) {
    return this.users.findAll(query, ctxOf(req));
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  @ApiOperation({ summary: 'Export users as CSV' })
  export(@Query() query: QueryUsersDto) {
    return this.users.exportCsv(query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Recent activity (audit feed)' })
  recentActivity() {
    return this.users.recentActivity();
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  create(@Body() dto: CreateUserDto, @Req() req: Request & { user: RequestUser }) {
    return this.users.create(dto, ctxOf(req));
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Enable / disable user' })
  setActive(
    @Param('id') id: string,
    @Body('isActive', new ParseBoolPipe()) isActive: boolean,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.users.setActive(id, isActive, ctxOf(req));
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (admin)' })
  resetPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.users.resetPassword(id, newPassword, ctxOf(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.users.remove(id, ctxOf(req));
  }
}