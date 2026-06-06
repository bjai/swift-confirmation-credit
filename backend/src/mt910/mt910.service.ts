import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mt910Message } from './entities/mt910-message.entity';
import { Mt910ParserService, ParsedMt910, SenderToReceiverCategory } from './mt910-parser.service';
import { QueryMt910Dto } from './dto/query-mt910.dto';

export interface CategorySummary {
  key: string;
  label: string;
  count: number;
}

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
      messageType: this.parser.detectMessageType(rawContent),
    });
    return this.repo.save(msg);
  }

  async findAll(query: QueryMt910Dto): Promise<{ data: Mt910Message[]; total: number; page: number; limit: number }> {
    const { search, currency, senderToReceiverCategory, senderToReceiverQualifier, valueDateFrom, valueDateTo, dateFrom, dateTo, processedDateFrom, processedDateTo, messageType = 'MT910', page = 1, limit = 20 } = query;
    const qb = this.repo.createQueryBuilder('m');

    // Filter by message type
    qb.andWhere('m.messageType = :messageType', { messageType });

    if (search) {
      qb.andWhere(
        '(m.senderReference ILIKE :s OR m.relatedReference ILIKE :s OR m.orderingCustomer ILIKE :s OR m.accountIdentification ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (currency) {
      qb.andWhere('m.currency = :currency', { currency });
    }
    if (senderToReceiverCategory) {
      if (senderToReceiverCategory === 'uncategorized') {
        qb.andWhere('(m.senderToReceiverCategory IS NULL OR m.senderToReceiverCategory = :uncategorizedKey)', {
          uncategorizedKey: 'uncategorized',
        });
      } else {
        qb.andWhere('m.senderToReceiverCategory = :senderToReceiverCategory', { senderToReceiverCategory });
      }
    }
    if (senderToReceiverQualifier) {
      qb.andWhere('m.senderToReceiverQualifier = :senderToReceiverQualifier', { senderToReceiverQualifier });
    }
    if (valueDateFrom) {
      qb.andWhere('m.valueDate >= :valueDateFrom', { valueDateFrom });
    }
    if (valueDateTo) {
      qb.andWhere('m.valueDate <= :valueDateTo', { valueDateTo });
    }
    // Support for legacy dateFrom/dateTo parameters (for backwards compatibility)
    if (dateFrom && !valueDateFrom) {
      qb.andWhere('m.valueDate >= :dateFrom', { dateFrom });
    }
    if (dateTo && !valueDateTo) {
      qb.andWhere('m.valueDate <= :dateTo', { dateTo });
    }
    if (processedDateFrom) {
      qb.andWhere('m.processedAt >= :processedDateFrom', { processedDateFrom });
    }
    if (processedDateTo) {
      qb.andWhere('m.processedAt <= :processedDateTo', { processedDateTo });
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

  async filtersMeta(): Promise<{ currencies: string[]; qualifiers: string[]; categories: Array<{ key: string; label: string }>; minDate: string; maxDate: string }> {
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

    let categories: Array<{ key: string; label: string }> = [];
    let qualifiers: string[] = [];

    try {
      categories = await this.repo
        .createQueryBuilder('m')
        .select('m.senderToReceiverCategory', 'key')
        .addSelect('m.senderToReceiverCategoryLabel', 'label')
        .where('m.senderToReceiverCategory IS NOT NULL')
        .groupBy('m.senderToReceiverCategory')
        .addGroupBy('m.senderToReceiverCategoryLabel')
        .orderBy('m.senderToReceiverCategoryLabel', 'ASC')
        .getRawMany()
        .then((rows) => rows.filter((r) => r.key && r.label));

      qualifiers = await this.repo
        .createQueryBuilder('m')
        .select('m.senderToReceiverQualifier', 'qualifier')
        .where('m.senderToReceiverQualifier IS NOT NULL')
        .groupBy('m.senderToReceiverQualifier')
        .orderBy('m.senderToReceiverQualifier', 'ASC')
        .getRawMany()
        .then((rows) => rows.map((r) => r.qualifier).filter(Boolean));
    } catch {
      // Fallback for environments where new columns are not available yet.
      categories = [];
      qualifiers = [];
    }

    return {
      currencies,
      qualifiers,
      categories,
      minDate: minMax?.minDate ?? null,
      maxDate: minMax?.maxDate ?? null,
    };
  }

  async categorySummary(valueDateFrom?: string, valueDateTo?: string, messageType: 'MT910' | 'MT900' = 'MT910'): Promise<CategorySummary[]> {
    try {
      let qb = this.repo
        .createQueryBuilder('m')
        .select('COALESCE(m.senderToReceiverCategory, \'uncategorized\')', 'key')
        .addSelect('COALESCE(m.senderToReceiverCategoryLabel, \'Other\')', 'label')
        .addSelect('COUNT(1)', 'count')
        .andWhere('m.messageType = :messageType', { messageType });
      if (valueDateFrom) {
        qb = qb.andWhere('m.valueDate >= :valueDateFrom', { valueDateFrom });
      }
      if (valueDateTo) {
        qb = qb.andWhere('m.valueDate <= :valueDateTo', { valueDateTo });
      }
      const rows = await qb
        .groupBy("COALESCE(m.senderToReceiverCategory, 'uncategorized')")
        .addGroupBy("COALESCE(m.senderToReceiverCategoryLabel, 'Other')")
        .orderBy('COUNT(1)', 'DESC')
        .getRawMany();
      return rows.map((r) => ({ key: r.key, label: r.label, count: Number(r.count) }));
    } catch {
      return [];
    }
  }

  async qualifierSummary(valueDateFrom?: string, valueDateTo?: string, messageType: 'MT910' | 'MT900' = 'MT910'): Promise<Array<{ qualifier: string; count: number }>> {
    try {
      let qb = this.repo
        .createQueryBuilder('m')
        .select('m.senderToReceiverQualifier', 'qualifier')
        .addSelect('COUNT(1)', 'count')
        .where('m.senderToReceiverQualifier IS NOT NULL')
        .andWhere('m.messageType = :messageType', { messageType });
      if (valueDateFrom) {
        qb = qb.andWhere('m.valueDate >= :valueDateFrom', { valueDateFrom });
      }
      if (valueDateTo) {
        qb = qb.andWhere('m.valueDate <= :valueDateTo', { valueDateTo });
      }
      const rows = await qb
        .groupBy('m.senderToReceiverQualifier')
        .orderBy('COUNT(1)', 'DESC')
        .getRawMany();
      return rows.map((r) => ({ qualifier: r.qualifier, count: Number(r.count) }));
    } catch {
      return [];
    }
  }

  async reclassifySenderToReceiverInfo(): Promise<{ updated: number }> {
    const messages = await this.repo.find();
    let updated = 0;

    for (const msg of messages) {
      const next: SenderToReceiverCategory = this.parser.classifySenderToReceiverInfo(msg.senderToReceiverInfo);
      const nextQualifier = this.parser.extractSenderToReceiverQualifier(msg.senderToReceiverInfo);
      if (
        msg.senderToReceiverQualifier !== nextQualifier ||
        msg.senderToReceiverCategory !== next.key ||
        msg.senderToReceiverCategoryLabel !== next.label
      ) {
        msg.senderToReceiverQualifier = nextQualifier;
        msg.senderToReceiverCategory = next.key;
        msg.senderToReceiverCategoryLabel = next.label;
        await this.repo.save(msg);
        updated += 1;
      }
    }

    return { updated };
  }

  async deleteAllMessages(): Promise<{ deleted: number; message: string }> {
    const countBefore = await this.repo.count();

    // Delete all records
    await this.repo.delete({});

    // Reset the sequence (auto-increment)
    await this.repo.query(
      'ALTER SEQUENCE mt910_messages_id_seq RESTART WITH 1',
    );

    return {
      deleted: countBefore,
      message: `Successfully deleted ${countBefore} message(s) and reset the database sequence.`,
    };
  }
}
