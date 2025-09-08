import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
const routes: Routes = [
  { path: '', component: ClientesListComponent },
  { path: 'clientes/new', component: ClienteFormComponent },
  { path: 'clientes/edit/:id', component: ClienteFormComponent },
  { path: 'datos-clientes/new', component: DatosClienteFormComponent },
  { path: 'datos-clientes/edit/:id', component: DatosClienteFormComponent }
];

import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { ClientesListComponent } from './clientes-list/clientes-list.component';
import { ClienteFormComponent } from './cliente-form/cliente-form.component';
import { DatosClientesListComponent } from './datos-clientes-list/datos-clientes-list.component';
import { DatosClienteFormComponent } from './datos-cliente-form/datos-cliente-form.component';

@NgModule({
  declarations: [
    AppComponent,
    ClientesListComponent,
    ClienteFormComponent,
    DatosClientesListComponent,
    DatosClienteFormComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
