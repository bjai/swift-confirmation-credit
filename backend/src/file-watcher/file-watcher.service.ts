import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mt910Service } from '../mt910/mt910.service';
import { Mt910ParserService } from '../mt910/mt910-parser.service';
import { AppSettingsService, FolderConfig } from '../mt910/app-settings.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileWatcherService implements OnModuleInit {
  private readonly logger = new Logger(FileWatcherService.name);
  private inputDir: string;
  private processedDir: string;
  private rejectedDir: string;
  private watcher: fs.FSWatcher | null = null;

  constructor(
    private readonly mt910Service: Mt910Service,
    private readonly parser: Mt910ParserService,
    private readonly appSettings: AppSettingsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const folders = await this.appSettings.getFolders();
    this.applyFolders(folders);
    this.processExistingFiles();
    this.startWatcher();

    this.appSettings.on('foldersChanged', (folders: FolderConfig) => {
      this.logger.log('Folder config changed — restarting watcher');
      this.applyFolders(folders);
      if (this.watcher) { this.watcher.close(); this.watcher = null; }
      this.startWatcher();
    });
  }

  private applyFolders(folders: FolderConfig) {
    this.inputDir = path.resolve(folders.inputFolder);
    this.processedDir = path.resolve(folders.processedFolder);
    this.rejectedDir = path.resolve(folders.rejectedFolder);
    this.ensureDirs();
    this.logger.log(`Folders — input: ${this.inputDir} | processed: ${this.processedDir} | rejected: ${this.rejectedDir}`);
  }

  private ensureDirs() {
    [this.inputDir, this.processedDir, this.rejectedDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  private startWatcher() {
    this.logger.log(`Watching folder: ${this.inputDir}`);
    this.watcher = fs.watch(this.inputDir, (eventType, filename) => {
      if (eventType === 'rename' && filename && this.isTxtFile(filename)) {
        const filePath = path.join(this.inputDir, filename);
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            this.processFile(filePath, filename).catch((err) =>
              this.logger.error(`Unhandled error processing "${filename}": ${err?.message ?? err}`),
            );
          }
        }, 500);
      }
    });
  }

  private processExistingFiles() {
    const files = fs.readdirSync(this.inputDir).filter(this.isTxtFile);
    if (files.length > 0) {
      this.logger.log(`Processing ${files.length} existing file(s) in input folder`);
    }
    for (const file of files) {
      this.processFile(path.join(this.inputDir, file), file).catch((err) =>
        this.logger.error(`Unhandled error processing "${file}": ${err?.message ?? err}`),
      );
    }
  }

  private async processFile(filePath: string, fileName: string): Promise<void> {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');

      const validation = this.parser.validate(raw);
      if (!validation.valid) {
        this.logger.warn(`Rejected "${fileName}": ${validation.reason}`);
        this.safeMove(filePath, path.join(this.rejectedDir, fileName), 'rejected');
        return;
      }

      const saved = await this.mt910Service.saveFromRaw(raw, fileName);
      this.logger.log(`Processed: ${fileName} → DB id=${saved.id}`);
      this.safeMove(filePath, path.join(this.processedDir, fileName), 'processed');
    } catch (err) {
      const errMsg: string = err?.response?.message ?? err?.message ?? String(err);
      const isDuplicate = errMsg.includes('Duplicate entry') || errMsg.includes('already exists');
      if (isDuplicate) {
        this.logger.warn(`Skipped duplicate "${fileName}": ${errMsg}`);
      } else {
        this.logger.error(`Failed to process "${fileName}": ${errMsg}`);
      }
      this.safeMove(filePath, path.join(this.rejectedDir, fileName), 'rejected');
    }
  }

  /** Move a file without throwing — logs on failure so the caller never crashes. */
  private safeMove(src: string, dest: string, label: string): void {
    try {
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        this.logger.log(`Moved to ${label}: ${dest}`);
      }
    } catch (moveErr) {
      this.logger.error(`Could not move "${src}" to ${label} folder: ${moveErr?.message ?? moveErr}`);
    }
  }

  private isTxtFile = (name: string) => name.toLowerCase().endsWith('.txt');
}
