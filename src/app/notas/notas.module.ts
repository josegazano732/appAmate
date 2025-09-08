import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NotaFormComponent } from './nota-form.component';
import { NotaPageComponent } from './nota-page.component';
import { NotasListComponent } from './notas-list.component';

const routes: Routes = [
  { path: '', component: NotasListComponent },
  { path: 'crear/:clienteId', component: NotaPageComponent }
];

@NgModule({
  declarations: [NotaFormComponent, NotaPageComponent, NotasListComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
  exports: []
})
export class NotasModule {}
