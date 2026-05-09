import { Injectable } from '@nestjs/common';

export interface ParsedMt910 {
  senderReference?: string;
  relatedReference?: string;
  accountIdentification?: string;
  valueDate?: string;
  currency?: string;
  amount?: number;
  orderingCustomer?: string;
  orderingInstitution?: string;
  intermediary?: string;
  senderToReceiverInfo?: string;
  senderToReceiverQualifier?: string;
  senderToReceiverCategory?: string;
  senderToReceiverCategoryLabel?: string;
}

export interface SenderToReceiverCategory {
  key: string;
  label: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class Mt910ParserService {

  /** Validate raw content before parsing */
  validate(raw: string): ValidationResult {
    if (!raw || raw.trim().length === 0) {
      return { valid: false, reason: 'File is empty' };
    }

    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Must contain mandatory MT910 field :20: (Sender Reference)
    if (!/:20:/.test(normalized)) {
      return { valid: false, reason: 'Missing mandatory field :20: (Sender Reference)' };
    }

    // Must contain mandatory MT910 field :32A: (Value Date / Currency / Amount)
    if (!/:32A:/.test(normalized)) {
      return { valid: false, reason: 'Missing mandatory field :32A: (Value Date/Currency/Amount)' };
    }

    return { valid: true };
  }

  parse(raw: string): ParsedMt910 {
    const result: ParsedMt910 = {};

    // Extract block 4 content between {4: and -}
    let content = raw;
    const block4Match = raw.match(/\{4:([\s\S]*?)-\}/);
    if (block4Match) {
      content = block4Match[1];
    }

    // Normalize line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into fields: each field starts with :TAG:
    const fieldRegex = /:([0-9]{2}[A-Z]?):([\s\S]*?)(?=\n:[0-9]{2}[A-Z]?:|$)/g;
    let match: RegExpExecArray | null;

    while ((match = fieldRegex.exec(content)) !== null) {
      const tag = match[1];
      const value = match[2].trim();

      switch (tag) {
        case '20':
          result.senderReference = value;
          break;
        case '21':
          result.relatedReference = value;
          break;
        case '25':
          result.accountIdentification = value;
          break;
        case '32A':
          this.parse32A(value, result);
          break;
        case '50':
        case '50A':
        case '50F':
        case '50K':
          result.orderingCustomer = value;
          break;
        case '52':
        case '52A':
        case '52D':
          result.orderingInstitution = value;
          break;
        case '56':
        case '56A':
        case '56C':
        case '56D':
          result.intermediary = value;
          break;
        case '72':
          result.senderToReceiverInfo = value;
          result.senderToReceiverQualifier = this.extractSenderToReceiverQualifier(value);
          const category = this.classifySenderToReceiverInfo(value);
          result.senderToReceiverCategory = category.key;
          result.senderToReceiverCategoryLabel = category.label;
          break;
      }
    }

    return result;
  }

  /** Parse :32A: YYMMDDCCCAMOUNT  e.g. 231015GBP150000,00 */
  private parse32A(value: string, result: ParsedMt910): void {
    const m = value.match(/^(\d{6})([A-Z]{3})([\d,]+)$/);
    if (!m) return;

    const [, dateStr, currency, amountStr] = m;
    const yy = parseInt(dateStr.substring(0, 2), 10);
    const mm = dateStr.substring(2, 4);
    const dd = dateStr.substring(4, 6);
    const fullYear = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy;

    result.valueDate = `${fullYear}-${mm}-${dd}`;
    result.currency = currency;
    result.amount = parseFloat(amountStr.replace(',', '.'));
  }

  classifySenderToReceiverInfo(raw: string | null | undefined): SenderToReceiverCategory {
    const normalized = this.normalizeSenderToReceiverText(raw);
    if (!normalized) {
      return { key: 'uncategorized', label: 'Other' };
    }

    const label = this.buildDynamicCategoryLabel(normalized);
    if (!label) {
      return { key: 'other', label: 'Other' };
    }

    return { key: this.toCategoryKey(label), label };
  }

  private normalizeSenderToReceiverText(raw: string | null | undefined): string {
    if (!raw) return '';

    return raw
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/^\/[A-Z]{3}\//, '') // strips SWIFT qualifier like /REC/
      .replace(/^\/+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractSenderToReceiverQualifier(raw: string | null | undefined): string {
    if (!raw) return null;
    const m = raw.trim().match(/^\/([A-Z0-9]{3})\//);
    return m ? m[1] : null;
  }

  private buildDynamicCategoryLabel(normalized: string): string {
    // Remove common reference-like tokens so category comes from meaning text.
    const withoutRefs = normalized
      .replace(/\b(?:INV|REF|TRN|PO|DOC)[-\s]?[A-Z0-9-]*\d+[A-Z0-9-]*\b/gi, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/[_/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const firstSegment = (withoutRefs || normalized).split(/[;,.]/)[0].trim();
    if (!firstSegment) return '';

    const words = firstSegment.split(/\s+/).filter(Boolean).slice(0, 4);
    if (!words.length) return '';

    return this.toDisplayLabel(words.join(' '));
  }

  private toCategoryKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'other';
  }

  private toDisplayLabel(text: string): string {
    const lowerWords = new Set(['for', 'of', 'and', 'to', 'in', 'on']);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    return words
      .map((w, i) => {
        if (i > 0 && lowerWords.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }
}
