import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Best-effort audit logging — app should never crash because auditing fails. */
  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
    } catch (err) {
      console.error('AuditLog write failed', err);
    }
  }
}