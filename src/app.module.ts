import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import * as http from 'http';
import * as https from 'https';

@Module({
  imports: [
    CacheModule.register(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 1000,
          limit: 100,
        },
      ],
    }),
    HttpModule.register({
      // 添加支持跨域重定向的 agent
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      maxRedirects: 10, // 控制最大重定向次数
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
