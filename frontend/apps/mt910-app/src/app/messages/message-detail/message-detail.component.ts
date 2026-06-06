import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Mt910Service, Mt910Message } from '@swift-mt910/mt910';
import { LoadingService } from '../../loading.service';

@Component({
  selector: 'app-message-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './message-detail.component.html',
  styleUrl: './message-detail.component.scss',
})
export class MessageDetailComponent implements OnInit {
  message: Mt910Message | null = null;
  error = '';
  deleting = false;
  showConfirm = false;
  nextMessageId: number | null = null;
  previousMessageId: number | null = null;
  messageType: 'MT910' | 'MT900' = 'MT910';

  constructor(private route: ActivatedRoute, private router: Router, private svc: Mt910Service, private loadingSvc: LoadingService) {}

  ngOnInit(): void {
    // Extract messageType from route data
    this.route.data.subscribe((data) => {
      this.messageType = data['messageType'] || 'MT910';
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadMessageAndNeighbors(id);
      }
    });
  }

  private loadMessageAndNeighbors(id: number) {
    this.loadingSvc.show();
    this.svc.getMessage(id).subscribe({
      next: (msg) => { 
        this.message = msg; 
        this.loadNeighboringMessages(id);
        this.loadingSvc.hide(); 
      },
      error: () => { this.error = 'Message not found.'; this.loadingSvc.hide(); },
    });
  }

  loadNeighboringMessages(currentId: number) {
    this.svc.getMessages({ page: 1, limit: 10000, messageType: this.messageType }).subscribe({
      next: (res) => {
        const ids = res.data.map(m => m.id);
        const currentIndex = ids.indexOf(currentId);
        this.previousMessageId = currentIndex > 0 ? ids[currentIndex - 1] : null;
        this.nextMessageId = currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;
      },
      error: () => { /* silently fail if neighbor lookup fails */ }
    });
  }

  goToMessage(id: number) {
    this.router.navigate(['/messages', id]);
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
