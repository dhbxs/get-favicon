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

  constructor(private readonly httpService: HttpService) { }

  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World!';
  }

  async getFavicon(url: string): Promise<StreamableFile> {
    this.logger.log(`Get favicon from ${url}`);

    // 先尝试从缓存获取
    const cachedImage = await this.getImageCache(url);
    if (cachedImage) {
      this.logger.log(`Using image cached for ${url}`);
      return new StreamableFile(cachedImage, { type: 'image/x-icon' });
    }

    const faviconUrl = await this.getFaviconFromHtmlPage(url);
    this.logger.log(`Favicon url is ${faviconUrl}`);

    // 对于网络资源，使用 NestJS 的 HttpService
    const response = lastValueFrom(
      this.httpService.get(faviconUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 10,
      }),
    );

    // 把响应response的图片数据放到缓存中方便下次快速使用
    const buffer = Buffer.from((await response).data);

    this.setImageCache(url, buffer);

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
    const cachedIconUrl = await this.getIconUrlCache(url);
    if (cachedIconUrl) {
      this.logger.log(`Using cached favicon URL: ${cachedIconUrl}`);
      return cachedIconUrl;
    }

    let iconUrl = '';
    const html = lastValueFrom(
      this.httpService.get(new URL(url).href, {
        responseType: 'text',
        maxRedirects: 10,
        validateStatus: () => true,
      })
    );

    const $ = cheerio.load((await html).data);

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
    this.logger.log(`Icon url is ${iconUrl}`);
    this.setIconUrlCache(url, iconUrl);
    return iconUrl;
  }

  /**
   * 将图片数据存入缓存
   */
  private async setImageCache(key: string, value: Buffer): Promise<void> {
    await this.cacheManager.set(`Img ${key}`, value, 1000 * 60 * 60 * 24);
  }

  /**
   * 将图标URL存入缓存
   */
  private async setIconUrlCache(key: string, value: string): Promise<void> {
    await this.cacheManager.set(`Url ${key}`, value, 1000 * 60 * 60 * 24);
  }

  /**
   * 获取图片缓存
   * @param key key
   * @returns 图片数据或null
   */
  private async getImageCache(key: string): Promise<Buffer | null> {
    const cachedImage = await this.cacheManager.get<Buffer>(`Img ${key}`);
    return cachedImage ?? null;
  }

  /**
   * 获取图片url
   * @param key key
   * @returns 图片url
   */
  private async getIconUrlCache(key: string): Promise<string | null> {
    const cachedUrl = await this.cacheManager.get<string>(`Url ${key}`);
    return cachedUrl ?? null;
  }
}
