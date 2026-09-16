import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Centered card shared by all sign-in and sign-up pages (rendered as child routes). */
@Component({
  imports: [RouterOutlet],
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
