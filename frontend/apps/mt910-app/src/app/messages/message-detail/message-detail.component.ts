import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Mt910Service, Mt910Message } from '@swift-mt910/mt910';

@Component({
  selector: 'app-message-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './message-detail.component.html',
})
export class MessageDetailComponent implements OnInit {
  message: Mt910Message | null = null;
  loading = true;
  error = '';
  deleting = false;
  showConfirm = false;

  constructor(private route: ActivatedRoute, private router: Router, private svc: Mt910Service) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getMessage(id).subscribe({
      next: (msg) => { this.message = msg; this.loading = false; },
      error: () => { this.error = 'Message not found.'; this.loading = false; },
    });
  }

  goBack() { this.router.navigate(['/messages']); }

  confirmDelete() { this.showConfirm = true; }
  cancelDelete() { this.showConfirm = false; }

  doDelete() {
    if (!this.message) return;
    this.deleting = true;
    this.svc.deleteMessage(this.message.id).subscribe({
      next: () => this.router.navigate(['/messages']),
      error: () => { this.deleting = false; this.error = 'Failed to delete. Please try again.'; this.showConfirm = false; },
    });
  }
}
