import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { CajaDashboardComponent } from './caja/caja-dashboard.component';
import { CajaMovimientosListComponent } from './caja/caja-movimientos-list.component';
import { CajaMovimientoFormComponent } from './caja/caja-movimiento-form.component';
const routes: Routes = [
  { path: '', component: ClientesListComponent },
  { path: 'clientes/new', component: ClienteFormComponent },
  { path: 'clientes/edit/:id', component: ClienteFormComponent },
  { path: 'datos-clientes/new', component: DatosClienteFormComponent },
  { path: 'datos-clientes/edit/:id', component: DatosClienteFormComponent },
  { path: 'caja', component: CajaDashboardComponent },
  { path: 'caja/movimientos', component: CajaMovimientosListComponent },
  { path: 'caja/movimientos/new', component: CajaMovimientoFormComponent },
  { path: 'notas', loadChildren: () => import('./notas/notas.module').then(m => m.NotasModule) },
  { path: 'inventario', loadChildren: () => import('./inventario/inventario.module').then(m => m.InventarioModule) }
];

import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotasService } from './notas/notas.service';
import { ClientesListComponent } from './clientes-list/clientes-list.component';
import { ClienteFormComponent } from './cliente-form/cliente-form.component';
import { DatosClientesListComponent } from './datos-clientes-list/datos-clientes-list.component';
import { DatosClienteFormComponent } from './datos-cliente-form/datos-cliente-form.component';
import { BreadcrumbComponent } from './shared/breadcrumb.component';
import { SharedModule } from './shared/shared.module';
// notas components moved to lazy module

@NgModule({
  declarations: [
    AppComponent,
    ClientesListComponent,
    ClienteFormComponent,
    DatosClientesListComponent,
    DatosClienteFormComponent,
  BreadcrumbComponent,
  CajaDashboardComponent,
  CajaMovimientosListComponent,
  CajaMovimientoFormComponent
  
  ],
  imports: [
    BrowserModule,
  CommonModule,
    FormsModule,
    HttpClientModule,
  RouterModule.forRoot(routes),
  SharedModule
  ],
  providers: [NotasService],
  bootstrap: [AppComponent]
})
export class AppModule { }
