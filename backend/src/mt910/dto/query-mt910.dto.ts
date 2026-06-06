import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryMt910Dto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  senderToReceiverCategory?: string;

  @IsOptional()
  @IsString()
  senderToReceiverQualifier?: string;

  @IsOptional()
  @IsString()
  valueDateFrom?: string;

  @IsOptional()
  @IsString()
  valueDateTo?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  processedDateFrom?: string;

  @IsOptional()
  @IsString()
  processedDateTo?: string;

  @IsOptional()
  @IsString()
  messageType?: 'MT910' | 'MT900';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
