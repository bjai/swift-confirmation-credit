import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mt910Message } from './entities/mt910-message.entity';
import { Mt910ParserService, ParsedMt910 } from './mt910-parser.service';
import { QueryMt910Dto } from './dto/query-mt910.dto';

@Injectable()
export class Mt910Service {
  constructor(
    @InjectRepository(Mt910Message)
    private readonly repo: Repository<Mt910Message>,
    private readonly parser: Mt910ParserService,
  ) {}

  async saveFromRaw(rawContent: string, fileName: string): Promise<Mt910Message> {
    const validation = this.parser.validate(rawContent);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid MT910 file "${fileName}": ${validation.reason}`);
    }

    const parsed: ParsedMt910 = this.parser.parse(rawContent);

    // Check for duplicate by senderReference + accountIdentification
    if (parsed.senderReference) {
      const existing = await this.repo.findOne({
        where: {
          senderReference: parsed.senderReference,
          accountIdentification: parsed.accountIdentification,
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Duplicate entry: MT910 message with reference "${parsed.senderReference}" and account "${parsed.accountIdentification}" already exists (id=${existing.id})`,
        );
      }
    }

    const msg = this.repo.create({
      ...parsed,
      rawContent,
      fileName,
      processedAt: new Date().toISOString(),
    });
    return this.repo.save(msg);
  }

  async findAll(query: QueryMt910Dto): Promise<{ data: Mt910Message[]; total: number; page: number; limit: number }> {
    const { search, currency, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const qb = this.repo.createQueryBuilder('m');

    if (search) {
      qb.andWhere(
        '(m.senderReference LIKE :s OR m.relatedReference LIKE :s OR m.orderingCustomer LIKE :s OR m.accountIdentification LIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (currency) {
      qb.andWhere('m.currency = :currency', { currency });
    }
    if (dateFrom) {
      qb.andWhere('m.valueDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('m.valueDate <= :dateTo', { dateTo });
    }

    qb.orderBy('m.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Mt910Message> {
    const msg = await this.repo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException(`MT910 message #${id} not found`);
    return msg;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // throws 404 if not found
    await this.repo.delete(id);
  }

  async filtersMeta(): Promise<{ currencies: string[]; minDate: string; maxDate: string }> {
    const currencies = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.currency', 'currency')
      .where('m.currency IS NOT NULL')
      .getRawMany()
      .then((rows) => rows.map((r) => r.currency).filter(Boolean));

    const minMax = await this.repo
      .createQueryBuilder('m')
      .select('MIN(m.valueDate)', 'minDate')
      .addSelect('MAX(m.valueDate)', 'maxDate')
      .getRawOne();

    return {
      currencies,
      minDate: minMax?.minDate ?? null,
      maxDate: minMax?.maxDate ?? null,
    };
  }
}
