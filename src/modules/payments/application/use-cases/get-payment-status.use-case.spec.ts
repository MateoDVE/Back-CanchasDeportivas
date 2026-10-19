import { GetPaymentStatusUseCase } from './get-payment-status.use-case';

import {
  IPaymentRepository,
} from '../../domain/repositories/payment.repository.interface';

describe('GetPaymentStatusUseCase', () => {
  let useCase: GetPaymentStatusUseCase;

  let paymentRepository:
    jest.Mocked<IPaymentRepository>;

  beforeEach(() => {
    paymentRepository = {
      findByReservationId: jest.fn(),
    } as unknown as jest.Mocked<IPaymentRepository>;

    useCase = new GetPaymentStatusUseCase(
      paymentRepository,
    );
  });

  it('debe retornar SIN_PAGO cuando el repositorio devuelve un arreglo vacío', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(
      paymentRepository.findByReservationId,
    ).toHaveBeenCalledWith('RES-001');

    expect(result).toEqual({
      reservationId: 'RES-001',
      hasPayment: false,
      status: 'SIN_PAGO',
    });
  });

  it('debe retornar SIN_PAGO cuando no existen pagos', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue(null as any);

    const result = await useCase.execute(
      'RES-002',
    );

    expect(result.reservationId)
      .toBe('RES-002');

    expect(result.hasPayment)
      .toBe(false);

    expect(result.status)
      .toBe('SIN_PAGO');
  });

  it('debe retornar VALIDADO cuando el anticipo está VALIDATED', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P1',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'QR',
          amount: 25,
          status: 'VALIDATED',
          receiptImageUrl: 'receipt.png',
          rejectionReason: null,
          handledBy: 'SEC-1',
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.hasPayment)
      .toBe(true);

    expect(result.status)
      .toBe('VALIDADO');

    expect(result.amount)
      .toBe(25);

    expect(result.paymentType)
      .toBe('ANTICIPO');

    expect(result.paymentMethod)
      .toBe('QR');

    expect(result.receiptImageUrl)
      .toBe('receipt.png');

    expect(result.rejectionReason)
      .toBeNull();

    expect(result.handledBy)
      .toBe('SEC-1');
  });

  it('debe retornar RECHAZADO cuando el anticipo está REJECTED', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P2',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'QR',
          amount: 25,
          status: 'REJECTED',
          receiptImageUrl: 'receipt.png',
          rejectionReason:
            'Comprobante inválido',
          handledBy: 'SEC-2',
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.status)
      .toBe('RECHAZADO');

    expect(result.rejectionReason)
      .toBe('Comprobante inválido');

    expect(result.handledBy)
      .toBe('SEC-2');
  });

  it('debe retornar COMPROBANTE_ENVIADO cuando existe imagen y aún no fue validado ni rechazado', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P3',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'QR',
          amount: 25,
          status: 'PENDING',
          receiptImageUrl:
            'https://test.com/receipt.png',
          rejectionReason: null,
          handledBy: null,
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.status)
      .toBe('COMPROBANTE_ENVIADO');

    expect(result.receiptImageUrl)
      .toBe(
        'https://test.com/receipt.png',
      );
  });

  it('debe retornar PENDIENTE cuando el pago no está validado, rechazado ni tiene comprobante', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P4',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'CASH',
          amount: 25,
          status: 'PENDING',
          receiptImageUrl: null,
          rejectionReason: null,
          handledBy: null,
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.status)
      .toBe('PENDIENTE');

    expect(result.hasPayment)
      .toBe(true);
  });

  it('debe tomar el último ANTICIPO cuando existen varios anticipos', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P1',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'QR',
          amount: 20,
          status: 'PENDING',
          receiptImageUrl: null,
          rejectionReason: null,
          handledBy: null,
        } as any,

        {
          id: 'P2',
          reservationId: 'RES-001',
          paymentType: 'FINAL',
          paymentMethod: 'CASH',
          amount: 75,
          status: 'VALIDATED',
          receiptImageUrl: null,
          rejectionReason: null,
          handledBy: 'SEC-1',
        } as any,

        {
          id: 'P3',
          reservationId: 'RES-001',
          paymentType: 'ANTICIPO',
          paymentMethod: 'QR',
          amount: 25,
          status: 'VALIDATED',
          receiptImageUrl: 'new.png',
          rejectionReason: null,
          handledBy: 'SEC-2',
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.paymentType)
      .toBe('ANTICIPO');

    expect(result.amount)
      .toBe(25);

    expect(result.status)
      .toBe('VALIDADO');

    expect(result.handledBy)
      .toBe('SEC-2');
  });

  it('debe tomar el último pago cuando no existe ningún ANTICIPO', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P1',
          reservationId: 'RES-001',
          paymentType: 'FINAL',
          paymentMethod: 'CASH',
          amount: 50,
          status: 'PENDING',
          receiptImageUrl: null,
          rejectionReason: null,
          handledBy: null,
        } as any,

        {
          id: 'P2',
          reservationId: 'RES-001',
          paymentType: 'REFUND',
          paymentMethod: 'CASH',
          amount: 10,
          status: 'VALIDATED',
          receiptImageUrl: null,
          rejectionReason: null,
          handledBy: 'ADMIN-1',
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-001',
    );

    expect(result.amount)
      .toBe(10);

    expect(result.paymentType)
      .toBe('REFUND');

    expect(result.status)
      .toBe('VALIDADO');

    expect(result.handledBy)
      .toBe('ADMIN-1');
  });

  it('debe devolver todos los campos del pago seleccionado', async () => {
    paymentRepository.findByReservationId
      .mockResolvedValue([
        {
          id: 'P10',
          reservationId: 'RES-XYZ',
          paymentType: 'ANTICIPO',
          paymentMethod: 'TRANSFER',
          amount: 80,
          status: 'REJECTED',
          receiptImageUrl: 'image.jpg',
          rejectionReason: 'Monto incorrecto',
          handledBy: 'SEC-99',
        } as any,
      ]);

    const result = await useCase.execute(
      'RES-XYZ',
    );

    expect(result).toEqual({
      reservationId: 'RES-XYZ',
      hasPayment: true,
      status: 'RECHAZADO',
      amount: 80,
      paymentType: 'ANTICIPO',
      paymentMethod: 'TRANSFER',
      receiptImageUrl: 'image.jpg',
      rejectionReason:
        'Monto incorrecto',
      handledBy: 'SEC-99',
    });
  });
});