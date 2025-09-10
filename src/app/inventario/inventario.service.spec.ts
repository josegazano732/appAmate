import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { InventarioService } from './inventario.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [InventarioService] });
    service = TestBed.inject(InventarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call revert endpoint and return new MovimientoID', () => {
    const mockResp = { ok: true, MovimientoID: 999 };
  service.revertMovimiento(123, 'motivo de prueba').subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.MovimientoID).toBe(999);
    });

    const req = httpMock.expectOne('http://localhost:3000/api/movimientos/123/revert');
    expect(req.request.method).toBe('POST');
  expect(req.request.body.motivo).toBe('motivo de prueba');
    req.flush(mockResp);
  });
});
