export interface Mt910Message {
  id: number;
  senderReference: string;
  relatedReference: string;
  accountIdentification: string;
  valueDate: string;
  currency: string;
  amount: number;
  orderingCustomer: string;
  orderingInstitution: string;
  intermediary: string;
  senderToReceiverInfo: string;
  senderToReceiverQualifier: string;
  senderToReceiverCategory: string;
  senderToReceiverCategoryLabel: string;
  fileName: string;
  rawContent: string;
  processedAt: string;
  createdAt: string;
}

export interface QualifierSummary {
  qualifier: string;
  count: number;
}

export interface SenderToReceiverCategoryOption {
  key: string;
  label: string;
}

export interface MessageListResponse {
  data: Mt910Message[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltersMeta {
  currencies: string[];
  qualifiers: string[];
  categories: SenderToReceiverCategoryOption[];
  minDate: string;
  maxDate: string;
}
