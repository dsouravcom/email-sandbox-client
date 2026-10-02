import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppLogo } from '../../../shared/ui/logo/logo';

/** Centered card shared by all sign-in and sign-up pages (rendered as child routes). */
@Component({
  imports: [RouterOutlet, RouterLink, AppLogo],
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
