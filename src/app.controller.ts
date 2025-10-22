import {
  Controller,
  Get,
  Inject,
  Logger,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Inject()
  private readonly appService: AppService;

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/get-favicon')
  async getFavicon(@Query('url') url: string): Promise<StreamableFile> {
    try {
      const result = await this.appService.getFavicon(url);
      return result;
    } catch (err) {
      this.logger.log(err);
      const file = createReadStream(
        join(process.cwd(), '/src/public/default-url.svg'),
      );
      return new StreamableFile(file, {
        type: 'image/svg+xml',
      });
    }
  }
}
