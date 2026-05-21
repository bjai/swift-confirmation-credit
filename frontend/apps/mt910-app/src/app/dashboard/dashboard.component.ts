import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Mt910Service, SenderToReceiverCategoryOption, QualifierSummary } from '@swift-mt910/mt910';
import { LoadingService } from '../loading.service';
import { FormsModule } from '@angular/forms';

interface CategoryCount extends SenderToReceiverCategoryOption {
  count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  // local loading flag removed; using global LoadingService overlay

  totalMessages = 0;
  categoryRows: CategoryCount[] = [];
  qualifierRows: QualifierSummary[] = [];
  // Table filter/sort state
  categoryFilter = '';
  categorySortAsc = true;

  qualifierFilter = '';
  qualifierSortAsc = true;
  // Control visibility of card/grid sections (we now prefer table views)
  showCards = false;

  constructor(private svc: Mt910Service, private router: Router, private loadingSvc: LoadingService) {}

  ngOnInit(): void {
    this.loadingSvc.show();
    forkJoin({
      categories: this.svc.getCategorySummary(),
      qualifiers: this.svc.getQualifierSummary(),
    }).subscribe({
      next: ({ categories, qualifiers }) => {
        this.categoryRows = categories;
        this.qualifierRows = qualifiers;
        this.totalMessages = categories.reduce((s, r) => s + r.count, 0);
        this.loadingSvc.hide();
      },
      error: () => { this.loadingSvc.hide(); },
    });
  }

  goToCategory(key: string) {
    this.router.navigate(['/messages'], {
      queryParams: { senderToReceiverCategory: key },
    });
  }

  goToQualifier(qualifier: string) {
    if (qualifier === '—') return;
    this.router.navigate(['/messages'], {
      queryParams: { senderToReceiverQualifier: qualifier },
    });
  }

  categoryIcon(key: string): string {
    const icons: Record<string, string> = {
      payment_invoice: 'bi-receipt',
      salary_payroll: 'bi-person-badge',
      refund_reimbursement: 'bi-arrow-counterclockwise',
      charges_fees: 'bi-percent',
      tax_settlement: 'bi-bank',
      loan_repayment: 'bi-cash-coin',
      rent_lease: 'bi-building',
      utilities: 'bi-lightning-charge',
      fund_transfer: 'bi-arrow-left-right',
      funds_received_from_correspondent: 'bi-box2-heart',
      bonus: 'bi-gift',
      other: 'bi-three-dots',
    };
    return icons[key] ?? 'bi-tag-fill';
  }

  getCategoryIconClass(key: string): string {
    const colors: Record<string, string> = {
      payment_invoice: 'icon-blue',
      salary_payroll: 'icon-green',
      refund_reimbursement: 'icon-orange',
      charges_fees: 'icon-red',
      tax_settlement: 'icon-purple',
      loan_repayment: 'icon-teal',
      rent_lease: 'icon-indigo',
      utilities: 'icon-amber',
      fund_transfer: 'icon-cyan',
      funds_received_from_correspondent: 'icon-pink',
      bonus: 'icon-emerald',
      other: 'icon-gray',
    };
    return colors[key] ?? 'icon-gray';
  }

  exportCsv() {
    // Fetch available option records (currencies, categories, qualifiers) and export them
    this.svc.getFiltersMeta().subscribe({
      next: (meta) => {
        const rows: Array<{ type: string; label_or_code: string; count: number }> = [];

        // Categories (with counts if available)
        rows.push({ type: 'Category', label_or_code: 'Category', count: 0 } as any);
        if (this.categoryRows.length > 0) {
          this.categoryRows.forEach((c) => rows.push({ type: 'Category', label_or_code: c.label, count: c.count }));
        } else if (meta.categories && meta.categories.length > 0) {
          meta.categories.forEach((c) => rows.push({ type: 'Category', label_or_code: c.label, count: 0 }));
        }

        // Separator
        rows.push({ type: '', label_or_code: '', count: 0 } as any);

        // Qualifiers
        rows.push({ type: 'Qualifier', label_or_code: 'Qualifier', count: 0 } as any);
        if (this.qualifierRows.length > 0) {
          this.qualifierRows.forEach((q) => rows.push({ type: 'Qualifier', label_or_code: q.qualifier, count: q.count }));
        } else if (meta.qualifiers && meta.qualifiers.length > 0) {
          meta.qualifiers.forEach((q) => rows.push({ type: 'Qualifier', label_or_code: q, count: 0 }));
        }

        // Separator
        rows.push({ type: '', label_or_code: '', count: 0 } as any);

        // Currencies
        rows.push({ type: 'Currency', label_or_code: 'Currency', count: 0 } as any);
        if (meta.currencies && meta.currencies.length > 0) {
          meta.currencies.forEach((c) => rows.push({ type: 'Currency', label_or_code: c, count: 0 }));
        }

        if (rows.length === 0) return;

        const headers = ['Type', 'Label/Code', 'Count'];
        const csvRows = rows.map((r) => [r.type, `"${r.label_or_code}"`, r.count.toString()].join(','));
        const csv = [headers.join(','), ...csvRows].join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_summary_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        // Fallback to existing in-memory rows if meta fetch fails
        const rows: Array<{ type: string; label_or_code: string; count: number }> = [];
        if (this.categoryRows.length > 0) {
          rows.push({ type: 'Category', label_or_code: 'Category', count: 0 } as any);
          this.categoryRows.forEach((c) => rows.push({ type: 'Category', label_or_code: c.label, count: c.count }));
        }
        if (rows.length > 0 && this.qualifierRows.length > 0) {
          rows.push({ type: '', label_or_code: '', count: 0 } as any);
        }
        if (this.qualifierRows.length > 0) {
          rows.push({ type: 'Qualifier', label_or_code: 'Qualifier', count: 0 } as any);
          this.qualifierRows.forEach((q) => rows.push({ type: 'Qualifier', label_or_code: q.qualifier, count: q.count }));
        }
        if (rows.length === 0) return;
        const headers = ['Type', 'Label/Code', 'Count'];
        const csvRows = rows.map((r) => [r.type, `"${r.label_or_code}"`, r.count.toString()].join(','));
        const csv = [headers.join(','), ...csvRows].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_summary_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  // Category table helpers
  get filteredCategoryRows(): CategoryCount[] {
    let rows = this.categoryRows.slice();
    if (this.categoryFilter && this.categoryFilter.trim() !== '') {
      const f = this.categoryFilter.trim().toLowerCase();
      rows = rows.filter(r => (r.label || '').toLowerCase().includes(f));
    }
    rows.sort((a, b) => this.categorySortAsc ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label));
    return rows;
  }

  get filteredCategoryRowsLeft(): CategoryCount[] {
    const all = this.filteredCategoryRows;
    return all.slice(0, Math.ceil(all.length / 2));
  }

  get filteredCategoryRowsRight(): CategoryCount[] {
    const all = this.filteredCategoryRows;
    return all.slice(Math.ceil(all.length / 2));
  }

  toggleCategorySort() { this.categorySortAsc = !this.categorySortAsc; }

  // Qualifier table helpers
  get filteredQualifierRows(): QualifierSummary[] {
    let rows = this.qualifierRows.slice();
    if (this.qualifierFilter && this.qualifierFilter.trim() !== '') {
      const f = this.qualifierFilter.trim().toLowerCase();
      rows = rows.filter(r => (r.qualifier || '').toLowerCase().includes(f));
    }
    rows.sort((a, b) => this.qualifierSortAsc ? a.qualifier.localeCompare(b.qualifier) : b.qualifier.localeCompare(a.qualifier));
    return rows;
  }

  toggleQualifierSort() { this.qualifierSortAsc = !this.qualifierSortAsc; }
}
