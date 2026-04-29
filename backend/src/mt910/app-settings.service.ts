import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter } from 'events';
import { AppSetting } from './entities/app-setting.entity';
import { ConfigService } from '@nestjs/config';

export interface FolderConfig {
  inputFolder: string;
  processedFolder: string;
  rejectedFolder: string;
}

@Injectable()
export class AppSettingsService extends EventEmitter {
  constructor(
    @InjectRepository(AppSetting)
    private readonly repo: Repository<AppSetting>,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async getFolders(): Promise<FolderConfig> {
    const rows = await this.repo.find();
    const map: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      inputFolder: map['INPUT_FOLDER'] ?? this.config.get('INPUT_FOLDER', 'input'),
      processedFolder: map['PROCESSED_FOLDER'] ?? this.config.get('PROCESSED_FOLDER', 'processed'),
      rejectedFolder: map['REJECTED_FOLDER'] ?? this.config.get('REJECTED_FOLDER', 'rejected'),
    };
  }

  async updateFolders(dto: FolderConfig): Promise<FolderConfig> {
    await this.repo.save([
      { key: 'INPUT_FOLDER', value: dto.inputFolder },
      { key: 'PROCESSED_FOLDER', value: dto.processedFolder },
      { key: 'REJECTED_FOLDER', value: dto.rejectedFolder },
    ]);
    this.emit('foldersChanged', dto);
    return dto;
  }
}
