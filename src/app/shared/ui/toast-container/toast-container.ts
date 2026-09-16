import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { IconName } from '../../../core/icons';
import { Toast, ToastVariant } from '../../../core/notifications/toast';

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
};

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: 'lucideCheckCircle2',
  error: 'lucideCircleAlert',
  info: 'lucideInfo',
};

/** Fixed-position queue of transient notifications, driven by the `Toast` service. */
@Component({
  selector: 'app-toast-container',
  imports: [NgIcon],
  template: `
    <div class="toast toast-end toast-bottom z-50">
      @for (message of toast.messages(); track message.id) {
        <div class="alert" [class]="variantClass(message.variant)" role="status">
          <ng-icon [name]="variantIcon(message.variant)" size="18" />
          <span class="text-sm">{{ message.text }}</span>
          <button type="button" class="btn btn-ghost btn-xs" (click)="toast.dismiss(message.id)" aria-label="Dismiss notification">
            <ng-icon name="lucideX" size="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  protected readonly toast = inject(Toast);

  protected variantClass(variant: ToastVariant): string {
    return VARIANT_CLASS[variant];
  }

  protected variantIcon(variant: ToastVariant): IconName {
    return VARIANT_ICON[variant];
  }
}
