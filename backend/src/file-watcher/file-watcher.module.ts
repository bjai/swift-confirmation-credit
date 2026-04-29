import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileWatcherService } from './file-watcher.service';
import { Mt910Module } from '../mt910/mt910.module';

@Module({
  imports: [Mt910Module, ConfigModule],
  providers: [FileWatcherService],
})
export class FileWatcherModule {}
