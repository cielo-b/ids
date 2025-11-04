import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { CacheModule as AppCacheModule } from "@app/common";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    HttpModule.register({ timeout: 30000, maxRedirects: 5 }),
    AppCacheModule,
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
