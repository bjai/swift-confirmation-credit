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
  fileName: string;
  rawContent: string;
  processedAt: string;
  createdAt: string;
}

export interface MessageListResponse {
  data: Mt910Message[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltersMeta {
  currencies: string[];
  minDate: string;
  maxDate: string;
}
