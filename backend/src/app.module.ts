import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Mt910Module } from './mt910/mt910.module';
import { FileWatcherModule } from './file-watcher/file-watcher.module';
import { Mt910Message } from './mt910/entities/mt910-message.entity';
import { AppSetting } from './mt910/entities/app-setting.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [Mt910Message, AppSetting],
        synchronize: true,
        ssl: { rejectUnauthorized: false },
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    Mt910Module,
    FileWatcherModule,
  ],
})
export class AppModule {}
