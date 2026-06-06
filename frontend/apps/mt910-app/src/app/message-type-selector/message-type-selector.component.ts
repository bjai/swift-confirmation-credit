import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-message-type-selector',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './message-type-selector.component.html',
  styleUrl: './message-type-selector.component.scss',
})
export class MessageTypeSelectorComponent {}

