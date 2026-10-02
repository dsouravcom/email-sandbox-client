import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AccountPreferencesStore } from '../../../core/account/account-preferences';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { EmailSummary } from '../../../core/emails/email-models';

@Component({
  selector: 'app-email-list-item',
  imports: [RouterLink, NgIcon, DatePipe],
  templateUrl: './email-list-item.html',
})
export class EmailListItem {
  protected readonly preferences = inject(AccountPreferencesStore);
  readonly email = input.required<EmailSummary>();
  readonly mailboxId = input.required<string>();
  readonly active = input(false);
}
