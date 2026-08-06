import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness & database readiness probe' })
  async health() {
    const db = await this.prisma.isHealthy();
    return {
      status: db ? 'ok' : 'degraded',
      db: db ? 'up' : 'down',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}