import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Mt910Service } from './mt910.service';
import { AppSettingsService } from './app-settings.service';
import { QueryMt910Dto } from './dto/query-mt910.dto';

@Controller('mt910')
export class Mt910Controller {
  constructor(
    private readonly service: Mt910Service,
    private readonly settings: AppSettingsService,
  ) {}

  /** POST /api/mt910/upload */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const raw = file.buffer.toString('utf-8');
    const message = await this.service.saveFromRaw(raw, file.originalname);
    return { success: true, id: message.id, fileName: message.fileName };
  }

  /** GET /api/mt910/messages */
  @Get('messages')
  findAll(@Query() query: QueryMt910Dto) {
    return this.service.findAll(query);
  }

  /** GET /api/mt910/messages/:id */
  @Get('messages/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** DELETE /api/mt910/messages/:id */
  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  /** GET /api/mt910/filters/meta */
  @Get('filters/meta')
  filtersMeta() {
    return this.service.filtersMeta();
  }

  /** GET /api/mt910/settings/folders */
  @Get('settings/folders')
  getFolders() {
    return this.settings.getFolders();
  }

  /** POST /api/mt910/settings/folders */
  @Post('settings/folders')
  updateFolders(@Body() dto: { inputFolder: string; processedFolder: string; rejectedFolder: string }) {
    if (!dto.inputFolder || !dto.processedFolder || !dto.rejectedFolder) {
      throw new BadRequestException('All three folder paths are required');
    }
    return this.settings.updateFolders(dto);
  }
}
