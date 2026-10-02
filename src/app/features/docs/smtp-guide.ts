import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLogo } from '../../shared/ui/logo/logo';
import site from '../../core/seo/site-content.json';

@Component({
  selector: 'app-smtp-guide',
  imports: [RouterLink, AppLogo],
  templateUrl: './smtp-guide.html',
})
export class SmtpGuide {
  protected readonly sections: {
    id: string;
    title: string;
    paragraphs?: string[];
    steps?: string[];
  }[] = site.guide;
}
