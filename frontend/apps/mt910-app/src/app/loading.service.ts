import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _loading = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading.asObservable();

  // Emit state changes asynchronously to avoid Angular
  // ExpressionChangedAfterItHasBeenCheckedError during init.
  show() { Promise.resolve().then(() => this._loading.next(true)); }
  hide() { Promise.resolve().then(() => this._loading.next(false)); }
}
