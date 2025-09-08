import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-breadcrumb',
  template: `
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li *ngFor="let item of items; let last = last" class="breadcrumb-item" [class.active]="last" [attr.aria-current]="last ? 'page' : null">
          <ng-container *ngIf="!last">
            <a [href]="item.link || '#'">{{item.label}}</a>
          </ng-container>
          <ng-container *ngIf="last">
            {{item.label}}
          </ng-container>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb {
      background: none;
      padding: 0;
      margin-bottom: 1rem;
    }
  `]
})
export class BreadcrumbComponent {
  @Input() items: { label: string, link?: string }[] = [];
}

// Nota: Este archivo pertenece al módulo principal; asegurarse de declarar en AppModule.
