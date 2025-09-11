import { ReciboDetailComponent } from './recibo-detail.component';
import { Recibo } from './recibo.model';

describe('ReciboDetailComponent', () => {
  let component: ReciboDetailComponent;

  beforeEach(() => {
    // Mock dependencias mínimas (no se usan en getter probado)
    const dummyRoute: any = { snapshot: { paramMap: new Map() } };
    const dummySvc: any = { getRecibo: () => ({ toPromise: async () => ({}) }) };
    component = new ReciboDetailComponent(dummyRoute, dummySvc);
  });

  it('usa NombreRazonSocial primero si está presente', () => {
    component.recibo = { ReciboID: 1, NombreRazonSocial: 'RAZON SRL' } as Recibo;
    expect(component.recClienteDisplay).toBe('RAZON SRL');
  });

  it('usa NombreFiscal si no hay NombreRazonSocial', () => {
    component.recibo = { ReciboID: 2, NombreFiscal: 'FISCAL SA' } as Recibo;
    expect(component.recClienteDisplay).toBe('FISCAL SA');
  });

  it('usa ClienteNombre si no hay razón ni fiscal', () => {
    component.recibo = { ReciboID: 3, ClienteNombre: 'Cliente Genérico' } as Recibo;
    expect(component.recClienteDisplay).toBe('Cliente Genérico');
  });

  it('usa fallback ID cuando faltan nombres', () => {
    component.recibo = { ReciboID: 4, ClienteID: 77 } as Recibo;
    expect(component.recClienteDisplay).toBe('ID 77');
  });

  it('usa N/D cuando no hay nada', () => {
    component.recibo = { ReciboID: 5 } as Recibo;
    expect(component.recClienteDisplay).toBe('N/D');
  });
});
