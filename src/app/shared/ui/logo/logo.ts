import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <div class="inline-flex items-center gap-2.5 select-none" [class.cursor-pointer]="clickable()">
      <!-- Custom Bespoke Vector Mark: Isometric Origami Mailbox & Safe Chamber -->
      <svg
        [attr.width]="size()"
        [attr.height]="size()"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="shrink-0 transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <!-- Gradient for the top envelope fold -->
          <linearGradient id="es-logo-top" x1="6" y1="5" x2="30" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.95" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.65" />
          </linearGradient>

          <!-- Gradient for the left chamber facet -->
          <linearGradient id="es-logo-left" x1="4" y1="12" x2="18" y2="31" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.25" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0.12" />
          </linearGradient>

          <!-- Gradient for the right chamber facet -->
          <linearGradient id="es-logo-right" x1="18" y1="17" x2="32" y2="31" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.18" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0.06" />
          </linearGradient>

          <!-- Glowing core aperture representing safe email containment -->
          <radialGradient id="es-logo-core" cx="18" cy="18" r="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="1" />
            <stop offset="70%" stop-color="var(--color-primary)" stop-opacity="0.4" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Outer Isometric Vault / Sandbox Enclosure -->
        <!-- Left Wall -->
        <path
          d="M5 11.5L18 19V32L5 24.5V11.5Z"
          fill="url(#es-logo-left)"
          stroke="currentColor"
          stroke-opacity="0.2"
          stroke-width="1.2"
          stroke-linejoin="round"
        />

        <!-- Right Wall -->
        <path
          d="M18 19L31 11.5V24.5L18 32V19Z"
          fill="url(#es-logo-right)"
          stroke="currentColor"
          stroke-opacity="0.2"
          stroke-width="1.2"
          stroke-linejoin="round"
        />

        <!-- Top Envelope Flap / Roof (Isometric Diamond) -->
        <path
          d="M18 4L31 11.5L18 19L5 11.5L18 4Z"
          fill="url(#es-logo-top)"
          stroke="var(--color-primary)"
          stroke-width="1.2"
          stroke-linejoin="round"
        />

        <!-- Internal Envelope Fold Lines (The Mail Geometry) -->
        <path
          d="M5 11.5L18 19L31 11.5"
          stroke="currentColor"
          stroke-opacity="0.35"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- The Safe Sandbox Core (Glowing Dot / Containment Spark) -->
        <circle cx="18" cy="19" r="4.5" fill="url(#es-logo-core)" />
        <circle cx="18" cy="19" r="1.8" fill="var(--color-primary)" />

        <!-- Front Crease Line for the Vault Depth -->
        <line
          x1="18"
          y1="19"
          x2="18"
          y2="32"
          stroke="currentColor"
          stroke-opacity="0.25"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>

      <!-- Wordmark -->
      @if (showWordmark()) {
        <div class="flex items-baseline gap-1.5 leading-none">
          <span class="font-extrabold tracking-tight text-ink font-sans" [class]="textClass()">
            Email<span class="text-primary font-medium">Sandbox</span>
          </span>
          @if (showBadge()) {
            <span class="font-mono text-[9px] font-semibold text-ink/40 tracking-wider uppercase">
              {{ badgeText() }}
            </span>
          }
        </div>
      }
    </div>
  `,
})
export class AppLogo {
  readonly size = input(28);
  readonly showWordmark = input(true);
  readonly showBadge = input(false);
  readonly badgeText = input('dev');
  readonly clickable = input(false);
  readonly textClass = input('text-base sm:text-lg');
}
