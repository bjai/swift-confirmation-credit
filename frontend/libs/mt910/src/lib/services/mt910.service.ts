import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mt910Message, MessageListResponse, FiltersMeta, SenderToReceiverCategoryOption, QualifierSummary } from '../models/mt910-message.model';
import { MT910_API_BASE } from '../mt910-api.token';

@Injectable({ providedIn: 'root' })
export class Mt910Service {
  constructor(
    @Inject(MT910_API_BASE) private base: string,
    private http: HttpClient,
  ) {}

  getMessages(filters: {
    search?: string;
    currency?: string;
    senderToReceiverQualifier?: string;
    senderToReceiverCategory?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Observable<MessageListResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.currency) params = params.set('currency', filters.currency);
    if (filters.senderToReceiverQualifier) params = params.set('senderToReceiverQualifier', filters.senderToReceiverQualifier);
    if (filters.senderToReceiverCategory) params = params.set('senderToReceiverCategory', filters.senderToReceiverCategory);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    return this.http.get<MessageListResponse>(`${this.base}/messages`, { params });
  }

  getMessage(id: number): Observable<Mt910Message> {
    return this.http.get<Mt910Message>(`${this.base}/messages/${id}`);
  }

  getFolderConfig(): Observable<{ inputFolder: string; processedFolder: string; rejectedFolder: string }> {
    return this.http.get<any>(`${this.base}/settings/folders`);
  }

  saveFolderConfig(dto: { inputFolder: string; processedFolder: string; rejectedFolder: string }): Observable<{ inputFolder: string; processedFolder: string; rejectedFolder: string }> {
    return this.http.post<any>(`${this.base}/settings/folders`, dto);
  }

  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/messages/${id}`);
  }

  getFiltersMeta(): Observable<FiltersMeta> {
    return this.http.get<FiltersMeta>(`${this.base}/filters/meta`);
  }

  getCategorySummary(): Observable<Array<SenderToReceiverCategoryOption & { count: number }>> {
    return this.http.get<Array<SenderToReceiverCategoryOption & { count: number }>>(`${this.base}/messages/category-summary`);
  }

  getQualifierSummary(): Observable<QualifierSummary[]> {
    return this.http.get<QualifierSummary[]>(`${this.base}/messages/qualifier-summary`);
  }

  reclassifySenderToReceiverInfo(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/messages/reclassify-72`, {});
  }

  uploadFile(file: File): Observable<{ success: boolean; id: number; fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.base}/upload`, formData);
  }
}
