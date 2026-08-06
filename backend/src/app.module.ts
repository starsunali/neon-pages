import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PagesModule } from './pages/pages.module';
import { QrModule } from './qr/qr.module';
import { FilesController } from './files/files.controller';
import { HealthController } from './health/health.controller';
import { JwtGlobalGuard } from './common/guards/jwt-global.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: process.env.ENV_FILE ?? '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get<number>('throttler.ttl') ?? 60) * 1000,
          limit: (config.get<number>('throttler.limit') ?? 100) * 10,
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    PagesModule,
    QrModule,
  ],
  controllers: [HealthController, FilesController],
  providers: [
    { provide: APP_GUARD, useClass: JwtGlobalGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}