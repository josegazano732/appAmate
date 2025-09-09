import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ProductoFormComponent } from './producto-form.component';
import { ProductoVariantesComponent } from './producto-variantes.component';
import { DepositoSectorFormComponent } from './deposito-sector-form.component';
import { StockListComponent } from './stock-list.component';
import { MovimientoFormComponent } from './movimiento-form.component';
import { MovimientoListComponent } from './movimiento-list.component';
import { ProductosListComponent } from './productos-list.component';

const routes: Routes = [
  { path: '', component: StockListComponent },
  { path: 'productos', component: ProductosListComponent },
  { path: 'productos/new', component: ProductoFormComponent },
  { path: 'productos/edit/:id', component: ProductoFormComponent },
  { path: 'productos/:id/variantes', component: ProductoVariantesComponent },
  { path: 'depositos', component: DepositoSectorFormComponent },
  { path: 'movimientos', component: MovimientoListComponent },
  { path: 'movimientos/new', component: MovimientoFormComponent }
];

@NgModule({
  declarations: [ProductoFormComponent, ProductoVariantesComponent, DepositoSectorFormComponent, StockListComponent, MovimientoFormComponent, ProductosListComponent, MovimientoListComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class InventarioModule {}
