import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'mt910/dashboard', pathMatch: 'full' },
  
  {
    path: 'mt910',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { messageType: 'MT910' },
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages/messages-list/messages-list.component').then(
            (m) => m.MessagesListComponent,
          ),
        data: { messageType: 'MT910' },
      },
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./messages/message-detail/message-detail.component').then(
            (m) => m.MessageDetailComponent,
          ),
        data: { messageType: 'MT910' },
      },
    ],
  },

  {
    path: 'mt900',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { messageType: 'MT900' },
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages/messages-list/messages-list.component').then(
            (m) => m.MessagesListComponent,
          ),
        data: { messageType: 'MT900' },
      },
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./messages/message-detail/message-detail.component').then(
            (m) => m.MessageDetailComponent,
          ),
        data: { messageType: 'MT900' },
      },
    ],
  },
];
