import { Controller, Get, Param, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join, normalize, resolve } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Serves generated QR files (PNG/SVG). Filenames are strictly validated to
 * prevent directory traversal.
 */
@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files/qr')
export class FilesController {
  constructor(private readonly config: ConfigService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Download a generated QR code file (PNG or SVG)' })
  download(@Param('filename') filename: string, @Res() res: Response) {
    if (!/^[a-z0-9-]+\.(png|svg)$/i.test(filename)) {
      throw new BadRequestException('Invalid file name');
    }
    const dir = resolve(process.cwd(), this.config.get<string>('qrStorageDir') ?? 'uploads/qr');
    const filePath = normalize(join(dir, filename));
    if (!filePath.startsWith(dir)) {
      throw new BadRequestException('Invalid file path');
    }
    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    const isSvg = filename.toLowerCase().endsWith('.svg');
    res.setHeader(
      'Content-Type',
      isSvg ? 'image/svg+xml' : 'image/png',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(filePath).pipe(res);
  }
}