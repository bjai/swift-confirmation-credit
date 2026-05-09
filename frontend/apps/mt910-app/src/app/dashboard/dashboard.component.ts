import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Mt910Service, SenderToReceiverCategoryOption, QualifierSummary } from '@swift-mt910/mt910';

interface CategoryCount extends SenderToReceiverCategoryOption {
  count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = true;

  totalMessages = 0;
  categoryRows: CategoryCount[] = [];
  qualifierRows: QualifierSummary[] = [];

  constructor(private svc: Mt910Service, private router: Router) {}

  ngOnInit(): void {
    forkJoin({
      categories: this.svc.getCategorySummary(),
      qualifiers: this.svc.getQualifierSummary(),
    }).subscribe({
      next: ({ categories, qualifiers }) => {
        this.categoryRows = categories;
        this.qualifierRows = qualifiers;
        this.totalMessages = categories.reduce((s, r) => s + r.count, 0);
        this.loading = false;
      },
      error: () => (this.loading = false),
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
    const rows: Array<{ type: string; label_or_code: string; count: number }> = [];

    // Add categories section
    if (this.categoryRows.length > 0) {
      rows.push({ type: 'Category', label_or_code: 'Category', count: 0 } as any); // Header
      this.categoryRows.forEach((c) => {
        rows.push({ type: 'Category', label_or_code: c.label, count: c.count });
      });
    }

    // Add blank row for separation
    if (rows.length > 0 && this.qualifierRows.length > 0) {
      rows.push({ type: '', label_or_code: '', count: 0 } as any);
    }

    // Add qualifiers section
    if (this.qualifierRows.length > 0) {
      rows.push({ type: 'Qualifier', label_or_code: 'Qualifier', count: 0 } as any); // Header
      this.qualifierRows.forEach((q) => {
        rows.push({ type: 'Qualifier', label_or_code: q.qualifier, count: q.count });
      });
    }

    if (rows.length === 0) return;

    const headers = ['Type', 'Label/Code', 'Count'];
    const csvRows = rows.map((r) => [r.type, r.label_or_code, r.count.toString()].join(','));
    const csv = [headers.join(','), ...csvRows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
