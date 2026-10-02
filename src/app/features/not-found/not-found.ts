import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template:
    '<main class="mx-auto max-w-2xl px-6 py-20 text-ink"><p class="text-sm text-primary">404</p><h1 class="mt-3 text-3xl font-bold">Page not found</h1><p class="mt-4 text-ink/60">This page could not be found. Visit the homepage or the SMTP testing guide.</p><div class="mt-6 flex gap-4"><a routerLink="/" class="btn btn-primary btn-sm">Go home</a><a routerLink="/docs" class="btn btn-ghost btn-sm">SMTP testing guide</a></div></main>',
})
export class NotFound {}
