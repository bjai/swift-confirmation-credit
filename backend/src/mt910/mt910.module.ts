import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mt910Message } from './entities/mt910-message.entity';
import { AppSetting } from './entities/app-setting.entity';
import { Mt910Service } from './mt910.service';
import { Mt910Controller } from './mt910.controller';
import { Mt910ParserService } from './mt910-parser.service';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mt910Message, AppSetting])],
  controllers: [Mt910Controller],
  providers: [Mt910Service, Mt910ParserService, AppSettingsService],
  exports: [Mt910Service, Mt910ParserService, AppSettingsService],
})
export class Mt910Module {}
