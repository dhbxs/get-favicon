import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Inject, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class AppService {
  @Inject(CACHE_MANAGER)
  private cacheManager: Cache;

  constructor(private readonly httpService: HttpService) {}

  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World!';
  }

  async getFavicon(url: string): Promise<StreamableFile> {
    this.logger.log(`Get favicon from ${url}`);

    const faviconUrl = await this.getFaviconFromHtmlPage(url);
    this.logger.log(`Favicon url is ${faviconUrl}`);

    // 对于网络资源，使用 NestJS 的 HttpService
    const response = lastValueFrom(
      this.httpService.get(faviconUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 10,
      }),
    );

    await this.setCache(url, faviconUrl);

    return new StreamableFile((await response).data, {
      type: (await response).headers['content-type'],
    });
  }

  /**
   * 从网页中获取favicon的url
   * @param url 网页的url
   * @returns favicon的url
   */
  private async getFaviconFromHtmlPage(url: string): Promise<string> {
    // 先尝试从缓存获取
    const cachedIconUrl = await this.cacheManager.get<string>(url);
    if (cachedIconUrl) {
      this.logger.log(`Using cached favicon URL: ${cachedIconUrl}`);
      return cachedIconUrl;
    }

    let iconUrl = '';

    const $ = await cheerio.fromURL(new URL(url));
    this.logger.log(`HTML page is ${$.html()}`);

    const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr('href');
    const favicon = $('link[rel="icon"]').attr('href');
    const shortcutFavicon = $('link[rel="shortcut icon"]').attr('href');
    const finalFavicon = appleTouchIcon ?? favicon ?? shortcutFavicon;
    this.logger.log(`Apple touch icon is ${appleTouchIcon}`);
    this.logger.log(`Favicon is ${favicon}`);
    this.logger.log(`Shortcut favicon is ${shortcutFavicon}`);
    this.logger.log(`Final favicon is ${finalFavicon}`);
    if (finalFavicon !== undefined) {
      iconUrl = new URL(finalFavicon, new URL(url)).href;
    } else {
      iconUrl = new URL('/favicon.ico', new URL(url)).href;
    }
    return iconUrl;
  }

  private async setCache(key: string, value: string): Promise<void> {
    await this.cacheManager.set(key, value, 1000 * 60 * 60 * 24);
  }
}
