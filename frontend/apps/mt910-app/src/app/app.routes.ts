import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'messages', pathMatch: 'full' },
  {
    path: 'messages',
    loadComponent: () =>
      import('./messages/messages-list/messages-list.component').then(
        (m) => m.MessagesListComponent,
      ),
  },
  {
    path: 'messages/:id',
    loadComponent: () =>
      import('./messages/message-detail/message-detail.component').then(
        (m) => m.MessageDetailComponent,
      ),
  },
];
