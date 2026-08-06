import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { AdminPagesController } from './admin-pages.controller';
import { PagesService } from './pages.service';
import { QrModule } from '../qr/qr.module';

@Module({
  imports: [QrModule],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}