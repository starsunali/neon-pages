import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, writeFile as fsWriteFile } from 'fs';
import { promisify } from 'util';
import * as QRCode from 'qrcode';

const writeFile = promisify(fsWriteFile);

export interface GeneratedQr {
  pngPath: string;
  svgPath: string;
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly storageDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.storageDir = resolve(
      process.cwd(),
      this.config.get<string>('qrStorageDir') ?? 'uploads/qr',
    );
    this.publicBaseUrl =
      this.config.get<string>('publicBaseUrl') ?? 'https://localhost';
  }

  /** Build the absolute public URL a QR code should encode for a given slug. */
  publicUrlFor(slug: string): string {
    return `${this.publicBaseUrl.replace(/\/+$/, '')}/p/${encodeURIComponent(slug)}`;
  }

  /**
   * Generate a QR PNG + SVG for a page slug and persist both under the QR
   * storage directory. Returns the relative file paths (as stored on the Page).
   */
  async generateForUrl(slug: string): Promise<GeneratedQr> {
    if (!existsSync(this.storageDir)) mkdirSync(this.storageDir, { recursive: true });

    const url = this.publicUrlFor(slug);
    // Re-target into the storage dir; overwrite any previous variant for the slug.
    const base = slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'page';

    const pngPath = join(this.storageDir, `${base}.png`);
    const svgPath = join(this.storageDir, `${base}.svg`);

    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      width: 512,
      errorCorrectionLevel: 'M',
    });

    await writeFile(pngPath, png);
    await writeFile(svgPath, svg);

    return { pngPath, svgPath };
  }
}