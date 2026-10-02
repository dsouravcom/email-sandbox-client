import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot, maxLength, readonly, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../core/auth/auth-store';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { OrganizationApi, OrganizationMember, OrganizationInvitation } from '../../../core/organizations/organization-api';
import { Organization } from '../../../core/organizations/organization-models';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { Toast } from '../../../core/notifications/toast';
import { CopyButton } from '../../../shared/ui/copy-button/copy-button';
import { FieldError } from '../../../shared/ui/field-error/field-error';

@Component({
  selector: 'app-organization-settings',
  imports: [FormsModule, FormRoot, FormField, FieldError, DatePipe, DecimalPipe, RouterLink, NgIcon, CopyButton],
  templateUrl: './organization-settings.html',
})
export class OrganizationSettings {
  private readonly api = inject(OrganizationApi);
  private readonly toast = inject(Toast);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly tabs = ['overview', 'members', 'invitations', 'organizations', 'settings'] as const;
  protected readonly tab = signal<string>('overview');
  protected readonly members = signal<OrganizationMember[]>([]);
  protected readonly incoming = signal<OrganizationInvitation[]>([]);
  protected readonly outgoing = signal<OrganizationInvitation[]>([]);
  protected readonly managementLoading = signal(false);
  protected readonly managementError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected newName = '';
  protected inviteEmail = '';
  protected inviteRole: OrganizationInvitation['role'] = 'member';
  protected readonly confirmation = signal<{ message: string; action: () => Promise<void> } | null>(null);
  protected readonly organizationStore = inject(OrganizationStore);
  protected readonly mailboxStore = inject(MailboxStore);
  protected readonly organization = signal<Organization | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly refreshKey = signal(0);
  private readonly model = signal({ name: '' });

  protected readonly canEdit = computed(() => {
    const role = this.organization()?.role;
    return role === 'owner' || role === 'admin';
  });
  protected readonly inboxes = computed(() => this.mailboxStore.mailboxes()
    .filter((mailbox) => mailbox.organizationId === this.organization()?.id));
  protected readonly emailUsagePercent = computed(() => this.percent(this.organization()?.monthlyUsage, this.organization()?.limits.emailsPerMonth));
  protected readonly inboxUsagePercent = computed(() => this.percent(this.organization()?.mailboxCount, this.organization()?.limits.maxMailboxes));
  protected readonly memberUsagePercent = computed(() => this.percent(this.organization()?.teamMemberCount, this.organization()?.limits.maxTeamMembers));

  protected readonly settingsForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required' });
    maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });
    readonly(path.name, { when: () => !this.canEdit() });
  }, {
    submission: {
      action: async (field) => {
        const organization = this.organization();
        if (!organization || !this.canEdit()) return undefined;
        this.errorMessage.set(null);
        try {
          const updated = await firstValueFrom(this.api.update(organization.id, { name: field().value().name }));
          this.organization.set(updated);
          this.organizationStore.applyUpdate(updated);
          this.toast.success('Organization settings saved.');
        } catch (error) {
          this.errorMessage.set(getApiErrorMessage(error));
        }
        return undefined;
      },
    },
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const requested = params.get('tab');
      if (requested && this.tabs.some((tab) => tab === requested)) this.tab.set(requested);
    });
    effect((onCleanup) => {
      const id = this.organizationStore.currentOrganizationId();
      this.refreshKey();
      this.organization.set(null);
      this.loadError.set(null);
      this.errorMessage.set(null);
      this.loading.set(false);
      if (!id) return;
      this.loading.set(true);
      const subscription = this.api.get(id).subscribe({
        next: (organization) => {
          this.organization.set(organization);
          this.model.set({ name: organization.name });
          this.loading.set(false);
          untracked(() => this.organizationStore.applyUpdate(organization));
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(getApiErrorMessage(error, 'Organization details could not be loaded. Please try again shortly.'));
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
    effect((onCleanup) => {
      const id = this.organizationStore.currentOrganizationId();
      this.refreshKey();
      this.members.set([]); this.outgoing.set([]); this.managementError.set(null);
      if (!id) return;
      this.managementLoading.set(true);
      const subscription = this.api.members(id).subscribe({
        next: (members) => { this.members.set(members); this.managementLoading.set(false); },
        error: (error: unknown) => { this.managementError.set(getApiErrorMessage(error)); this.managementLoading.set(false); },
      });
      onCleanup(() => subscription.unsubscribe());
    });
    effect((onCleanup) => {
      const org = this.organization();
      if (!org || !this.canEdit()) { this.outgoing.set([]); return; }
      const subscription = this.api.outgoing(org.id).subscribe({ next: (rows) => this.outgoing.set(rows), error: (error: unknown) => this.managementError.set(getApiErrorMessage(error)) });
      onCleanup(() => subscription.unsubscribe());
    });
    effect((onCleanup) => {
      this.refreshKey();
      const subscription = this.api.incoming().subscribe({ next: (rows) => this.incoming.set(rows), error: (error: unknown) => this.managementError.set(getApiErrorMessage(error)) });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected canManage(member: OrganizationMember): boolean {
    return member.userId !== this.auth.user()?.id && member.role !== 'owner' &&
      (this.organization()?.role === 'owner' || (this.organization()?.role === 'admin' && member.role !== 'admin'));
  }

  protected async createOrganization(): Promise<void> {
    await this.run(async () => {
      const org = await firstValueFrom(this.api.create(this.newName.trim()));
      this.newName = '';
      await this.organizationStore.loadOrganizations();
      this.organizationStore.selectOrganization(org.id);
      this.tab.set('overview');
    }, 'Organization created.');
  }

  protected async sendInvitation(): Promise<void> {
    const org = this.organization(); if (!org) return;
    await this.run(async () => { await firstValueFrom(this.api.invite(org.id, this.inviteEmail.trim(), this.inviteRole)); this.inviteEmail = ''; }, 'Invitation sent.');
  }

  protected async respond(invite: OrganizationInvitation, action: 'accept' | 'decline'): Promise<void> {
    await this.run(async () => {
      const result = await firstValueFrom(this.api.respond(invite.id, action));
      if (action === 'accept') {
        await this.organizationStore.loadOrganizations(); this.organizationStore.selectOrganization(result.organizationId); this.tab.set('overview');
      }
    }, action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.');
  }

  protected async cancelInvitation(invite: OrganizationInvitation): Promise<void> {
    const org = this.organization(); if (!org) return;
    await this.run(async () => { await firstValueFrom(this.api.cancel(org.id, invite.id)); }, 'Invitation cancelled.');
  }

  protected async changeRole(member: OrganizationMember, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const role = select.value as OrganizationInvitation['role'];
    select.value = member.role;
    const org = this.organization(); if (!org) return;
    await this.run(async () => { await firstValueFrom(this.api.changeMember(org.id, member.id, { role })); }, 'Role updated.');
  }

  protected async changeStatus(member: OrganizationMember): Promise<void> {
    const org = this.organization(); if (!org) return;
    await this.run(async () => { await firstValueFrom(this.api.changeMember(org.id, member.id, { status: member.status === 'active' ? 'suspended' : 'active' })); }, 'Membership updated.');
  }

  protected confirmRemove(member: OrganizationMember): void {
    const org = this.organization(); if (!org) return;
    this.confirmation.set({ message: `Remove ${member.name} from ${org.name}? They will immediately lose access.`, action: () => this.run(async () => { await firstValueFrom(this.api.removeMember(org.id, member.id)); }, 'Member removed.') });
  }

  protected confirmTransfer(member: OrganizationMember): void {
    const org = this.organization(); if (!org) return;
    this.confirmation.set({ message: `Transfer ownership to ${member.name}? You will become an administrator.`, action: () => this.run(async () => { await firstValueFrom(this.api.transfer(org.id, member.id)); await this.organizationStore.loadOrganizations(); }, 'Ownership transferred.') });
  }

  protected confirmLeave(): void {
    const org = this.organization(); if (!org) return;
    this.confirmation.set({ message: `Leave ${org.name}? You will need a new invitation to rejoin.`, action: () => this.run(async () => { await firstValueFrom(this.api.leave(org.id)); await this.organizationStore.loadOrganizations(); this.tab.set('organizations'); }, 'You left the organization.') });
  }

  protected async confirmAction(): Promise<void> {
    const confirmation = this.confirmation(); this.confirmation.set(null); await confirmation?.action();
  }

  private async run(action: () => Promise<void>, message: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.managementError.set(null);
    try { await action(); this.toast.success(message); this.refresh(); }
    catch (error) { this.managementError.set(getApiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }

  protected refresh(): void {
    const id = this.organizationStore.currentOrganizationId();
    if (!id) {
      void this.organizationStore.loadOrganizations();
      return;
    }
    this.refreshKey.update((key) => key + 1);
    void this.mailboxStore.loadForOrganization(id);
  }

  private percent(value = 0, limit = 0): number {
    return limit > 0 ? Math.min(100, Math.max(0, value / limit * 100)) : 0;
  }
}
