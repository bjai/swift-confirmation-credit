import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Mt910Service, Mt910Message, FiltersMeta } from '@swift-mt910/mt910';

@Component({
  selector: 'app-messages-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messages-list.component.html',
  styleUrl: './messages-list.component.scss',
})
export class MessagesListComponent implements OnInit {
  messages: Mt910Message[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;
  uploading = false;
  uploadError = '';
  uploadSuccess = '';
  deletingId: number | null = null;
  showDeleteConfirm = false;
  private deleteTargetId: number | null = null;
  filters = { search: '', currency: '', dateFrom: '', dateTo: '' };
  meta: FiltersMeta = { currencies: [], minDate: '', maxDate: '' };

  selectedIds = new Set<number>();

  // ── Settings ───────────────────────────────────────────────────────────────
  showSettings = false;
  settingsLoading = false;
  settingsSaving = false;
  settingsError = '';
  settingsSuccess = '';
  folders = { inputFolder: '', processedFolder: '', rejectedFolder: '' };

  openSettings() {
    this.showSettings = true;
    this.settingsError = '';
    this.settingsSuccess = '';
    this.settingsLoading = true;
    this.svc.getFolderConfig().subscribe({
      next: (f) => { this.folders = { ...f }; this.settingsLoading = false; },
      error: () => { this.settingsError = 'Failed to load settings.'; this.settingsLoading = false; },
    });
  }

  closeSettings() { this.showSettings = false; }

  saveSettings() {
    if (!this.folders.inputFolder || !this.folders.processedFolder || !this.folders.rejectedFolder) {
      this.settingsError = 'All folder paths are required.';
      return;
    }
    this.settingsSaving = true;
    this.settingsError = '';
    this.svc.saveFolderConfig(this.folders).subscribe({
      next: () => {
        this.settingsSaving = false;
        this.settingsSuccess = 'Folders saved. Watcher restarted automatically.';
      },
      error: (err) => {
        this.settingsSaving = false;
        this.settingsError = err?.error?.message ?? 'Failed to save settings.';
      },
    });
  }

  private searchSubject = new Subject<string>();

  constructor(private svc: Mt910Service) {}

  ngOnInit(): void {
    this.loadMeta();
    this.loadMessages();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.loadMessages();
    });
  }

  loadMeta() { this.svc.getFiltersMeta().subscribe((m) => (this.meta = m)); }

  loadMessages() {
    this.loading = true;
    this.svc.getMessages({ ...this.filters, page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.messages = res.data;
        this.total = res.total;
        this.loading = false;
        // Remove selections that no longer exist on this page
        const pageIds = new Set(res.data.map((m) => m.id));
        this.selectedIds.forEach((id) => { if (!pageIds.has(id)) this.selectedIds.delete(id); });
      },
      error: () => (this.loading = false),
    });
  }

  onSearchChange(value: string) { this.filters.search = value; this.searchSubject.next(value); }
  onFilterChange() { this.page = 1; this.loadMessages(); }
  clearFilters() { this.filters = { search: '', currency: '', dateFrom: '', dateTo: '' }; this.page = 1; this.loadMessages(); }
  onPageChange(p: number) { this.page = p; this.loadMessages(); }

  get totalPages(): number { return Math.ceil(this.total / this.limit); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  get allSelected(): boolean {
    return this.messages.length > 0 && this.messages.every((m) => this.selectedIds.has(m.id));
  }

  get someSelected(): boolean {
    return this.messages.some((m) => this.selectedIds.has(m.id));
  }

  toggleAll(checked: boolean) {
    if (checked) {
      this.messages.forEach((m) => this.selectedIds.add(m.id));
    } else {
      this.messages.forEach((m) => this.selectedIds.delete(m.id));
    }
  }

  toggleRow(id: number, checked: boolean) {
    checked ? this.selectedIds.add(id) : this.selectedIds.delete(id);
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────
  exportCsv() {
    const rows = this.messages.filter((m) => this.selectedIds.has(m.id));
    if (!rows.length) return;

    const headers = [
      'ID', 'Sender Reference', 'Related Reference', 'Account Identification',
      'Value Date / Currency / Amount', 'Ordering Customer', 'Ordering Institution',
      'Intermediary', 'Sender to Receiver Info', 'File Name', 'Processed At',
    ];

    const csvRows = rows.map((m) => [
      m.id,
      this.csvCell(m.senderReference),
      this.csvCell(m.relatedReference),
      this.csvCell(m.accountIdentification),
      this.csvCell(this.formatValueDateCurrencyAmount(m)),
      this.csvCell(m.orderingCustomer),
      this.csvCell(m.orderingInstitution),
      this.csvCell(m.intermediary),
      this.csvCell(m.senderToReceiverInfo),
      this.csvCell(m.fileName),
      this.csvCell(m.processedAt),
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mt910_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Format: YYMMDD + Currency + Amount (comma decimal), e.g. 260427USD125000,00 */
  private formatValueDateCurrencyAmount(m: Mt910Message): string {
    const datePart = m.valueDate
      ? m.valueDate.replace(/-/g, '').slice(2)   // "2026-04-27" → "260427"
      : '';
    const currency = m.currency ?? '';
    const amount = m.amount != null
      ? Number(m.amount).toFixed(2).replace('.', ',')
      : '';
    return `${datePart}${currency}${amount}`;
  }

  private csvCell(value: unknown): string {
    if (value == null) return '';
    const str = String(value).replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str}"`
      : str;
  }

  deleteRow(id: number) {
    this.deleteTargetId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.deleteTargetId = null;
  }

  confirmDelete() {
    if (this.deleteTargetId === null) return;
    const id = this.deleteTargetId;
    this.deletingId = id;
    this.svc.deleteMessage(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.selectedIds.delete(id);
        this.loadMeta();
        this.loadMessages();
      },
      error: (err) => {
        this.deletingId = null;
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.uploadError = err?.error?.message ?? 'Delete failed';
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';
    this.svc.uploadFile(input.files[0]).subscribe({
      next: (res) => {
        this.uploading = false;
        this.uploadSuccess = `"${res.fileName}" uploaded (ID: ${res.id})`;
        this.loadMeta();
        this.loadMessages();
        input.value = '';
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.error?.message ?? 'Upload failed';
        input.value = '';
      },
    });
  }
}
