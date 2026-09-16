import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { Mailbox } from '../../../core/mailboxes/mailbox-models';

/** One row in the mailboxes table: name, received count, last message, and an edit/delete menu. */
@Component({
  selector: 'app-mailbox-card',
  imports: [RouterLink, NgIcon, DatePipe],
  templateUrl: './mailbox-card.html',
})
export class MailboxCard {
  readonly mailbox = input.required<Mailbox>();

  readonly edit = output<Mailbox>();
  readonly delete = output<Mailbox>();
}
