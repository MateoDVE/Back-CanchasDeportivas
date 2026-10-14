import { supabaseStub } from '../../../test/support/supabase.stub';
import { SupabaseCourtRepository } from '../../modules/courts/infrastructure/repositories/supabase-court.repository';
import { SupabaseComplexRepository } from '../../modules/complexes/infrastructure/repositories/supabase-complex.repository';
import { SupabaseUserRepository } from '../../modules/users/infrastructure/repositories/supabase-user.repository';
import { SupabaseCourtIncidentRepository } from '../../modules/courts/infrastructure/repositories/supabase-court-incident.repository';
import { SupabasePaymentRepository } from '../../modules/payments/infrastructure/repositories/supabase-payment.repository';
import { SupabaseReservationRepository } from '../../modules/reservations/infrastructure/repositories/supabase-reservation.repository';
import { Court } from '../../modules/courts/domain/entities/court.entity';
import { Complex } from '../../modules/complexes/domain/entities/complex.entity';
import { User } from '../../modules/users/domain/entities/user.entity';
import { Payment } from '../../modules/payments/domain/entities/payment.entity';
import { CourtIncident } from '../../modules/courts/domain/entities/court-incident.entity';
import { Reservation } from '../../modules/reservations/domain/entities/reservation.entity';

const timestamp = '2026-10-14T12:00:00.000Z';
const courtRow = {
  id: 1,
  complex_id: 2,
  name: 'Norte',
  court_type: 'Futsal',
  price_per_hour: '100',
  is_active: true,
  cover_image_url: 'cover.png',
};
const complexRow = {
  id: 2,
  name: 'Complejo',
  location: 'La Paz',
  contact_info: '70000000',
  payment_qr_url: 'qr.png',
  is_active: true,
};
const userRow = {
  id: 'user',
  name: 'Cliente',
  email: 'client@example.test',
  phone: '70000000',
  password_hash: 'test-hash',
  role: 'CLIENTE',
  status: 'ACTIVE',
  created_at: timestamp,
  ci: null,
  first_name: null,
  last_name: null,
};
const incidentRow = {
  id: 3,
  court_id: 1,
  start_datetime: timestamp,
  end_datetime: '2026-10-14T14:00:00.000Z',
  reason: 'Mantenimiento',
  created_at: timestamp,
};
const paymentRow = {
  id: 4,
  reservation_id: 'reservation',
  amount: '50.25',
  payment_type: 'ANTICIPO',
  payment_method: 'QR',
  status: 'VALIDATED',
  handled_by: 'staff',
  receipt_image_url: 'receipt.png',
  rejection_reason: null,
  created_at: timestamp,
};
const bookingRow = {
  id: 'reservation',
  client_id: 'user',
  court_id: 1,
  reservation_date: '2026-10-14',
  start_time: '10:00:00',
  end_time: '12:00:00',
  price_per_hour: '100',
  total_price: '200',
  advance_required: '50',
  status: 'CONFIRMED',
  created_by: 'staff',
  created_at: timestamp,
  expires_at: null,
};

describe('Contratos de persistencia: datos, ausencia y errores', () => {
  let stub: ReturnType<typeof supabaseStub>;
  let courts: SupabaseCourtRepository;
  let complexes: SupabaseComplexRepository;
  let users: SupabaseUserRepository;
  let incidents: SupabaseCourtIncidentRepository;
  let payments: SupabasePaymentRepository;
  let bookings: SupabaseReservationRepository;
  beforeEach(() => {
    stub = supabaseStub();
    courts = new SupabaseCourtRepository(stub.client as never);
    complexes = new SupabaseComplexRepository(stub.client as never);
    users = new SupabaseUserRepository(stub.client as never);
    incidents = new SupabaseCourtIncidentRepository(stub.client as never);
    payments = new SupabasePaymentRepository(stub.client as never);
    bookings = new SupabaseReservationRepository(stub.client as never);
  });

  it.each([
    'court',
    'complex',
    'userId',
    'userEmail',
    'userCi',
    'incident',
  ] as const)(
    'consulta individual %s con datos, sin datos y con error',
    async (kind) => {
      const lookup = {
        court: () => courts.findById(1),
        complex: () => complexes.findById(2),
        userId: () => users.findById('user'),
        userEmail: () => users.findByEmail(' CLIENT@example.test '),
        userCi: () => users.findByCi(' ab12 '),
        incident: () => incidents.findById(3),
      }[kind];
      const row = {
        court: courtRow,
        complex: complexRow,
        userId: userRow,
        userEmail: userRow,
        userCi: userRow,
        incident: incidentRow,
      }[kind];
      stub.response.data = row;
      expect(await lookup()).toMatchObject({ id: row.id });
      if (kind === 'userEmail')
        expect(stub.query.eq).toHaveBeenCalledWith(
          'email',
          'client@example.test',
        );
      if (kind === 'userCi')
        expect(stub.query.eq).toHaveBeenCalledWith('ci', 'AB12');
      stub.response.data = null;
      expect(await lookup()).toBeNull();
      stub.response.error = { message: 'database unavailable' };
      expect(await lookup()).toBeNull();
    },
  );

  it.each([
    'courts',
    'complexCourts',
    'complexes',
    'users',
    'incidents',
    'activeIncidents',
  ] as const)('consulta lista %s y trata respuestas vacías', async (kind) => {
    const lookup = {
      courts: () => courts.findAll(),
      complexCourts: () => courts.findByComplex(2),
      complexes: () => complexes.findAll(),
      users: () => users.findAll(),
      incidents: () => incidents.findByCourt(1),
      activeIncidents: () =>
        incidents.findActiveIncidents(1, new Date(timestamp)),
    }[kind];
    const row = {
      courts: courtRow,
      complexCourts: courtRow,
      complexes: complexRow,
      users: userRow,
      incidents: incidentRow,
      activeIncidents: incidentRow,
    }[kind];
    stub.response.data = [row];
    expect(await lookup()).toEqual([expect.objectContaining({ id: row.id })]);
    stub.response.data = null;
    expect(await lookup()).toEqual([]);
    stub.response.error = { message: 'database unavailable' };
    expect(await lookup()).toEqual([]);
  });

  it('aplica filtros opcionales de actividad y transforma importes e imágenes', async () => {
    stub.response.data = [courtRow];
    expect(await courts.findAll(false)).toEqual([
      expect.objectContaining({ pricePerHour: 100, images: ['cover.png'] }),
    ]);
    expect(stub.query.eq).not.toHaveBeenCalled();
    await courts.findByComplex(2, false);
    expect(stub.query.eq).toHaveBeenCalledWith('complex_id', 2);
    expect(stub.query.eq).not.toHaveBeenCalledWith('is_active', true);
    stub.response.data = [complexRow];
    await complexes.findAll(true);
    expect(stub.query.eq).toHaveBeenCalledWith('is_active', true);
    stub.response.data = { ...courtRow, cover_image_url: null };
    expect((await courts.findById(1))?.images).toEqual([]);
  });

  it('consulta catálogo y propaga error de catálogo', async () => {
    stub.response.data = [{ code: 'Futsal', description: 'Cubierta' }];
    expect(await courts.findTypes()).toEqual([
      { type: 'Futsal', description: 'Cubierta' },
    ]);
    stub.response.data = null;
    expect(await courts.findTypes()).toEqual([]);
    stub.response.error = { message: 'catálogo no disponible' };
    await expect(courts.findTypes()).rejects.toThrow('catálogo no disponible');
  });

  it.each(['court', 'complex', 'incident', 'payment'] as const)(
    'guarda %s y rechaza error o respuesta sin entidad',
    async (kind) => {
      const court = new Court(1, 2, 'Norte', 'Futsal', 100, true, [
        'cover.png',
      ]);
      const complex = new Complex(
        2,
        'Complejo',
        'La Paz',
        '70000000',
        'qr.png',
      );
      const incident = new CourtIncident(
        3,
        1,
        new Date(timestamp),
        new Date(incidentRow.end_datetime),
        'Mantenimiento',
      );
      const payment = new Payment(
        4,
        'reservation',
        50.25,
        'ANTICIPO',
        'QR',
        'receipt.png',
        'VALIDATED',
      );
      const save = {
        court: () => courts.save(court),
        complex: () => complexes.save(complex),
        incident: () => incidents.save(incident),
        payment: () => payments.save(payment),
      }[kind];
      const row = {
        court: courtRow,
        complex: complexRow,
        incident: incidentRow,
        payment: paymentRow,
      }[kind];
      stub.response.data = row;
      expect(await save()).toMatchObject({ id: row.id });
      expect(stub.query.insert).toHaveBeenCalledWith(
        expect.objectContaining(
          kind === 'court'
            ? { cover_image_url: 'cover.png' }
            : kind === 'complex'
              ? { payment_qr_url: 'qr.png' }
              : kind === 'incident'
                ? { start_datetime: timestamp }
                : { amount: 50.25 },
        ),
      );
      stub.response.data = null;
      await expect(save()).rejects.toThrow();
      stub.response.error = { message: 'write failed' };
      await expect(save()).rejects.toThrow('write failed');
    },
  );

  it.each([
    'court',
    'price',
    'complex',
    'userSave',
    'userUpdate',
    'payment',
  ] as const)('actualización %s exitosa y con error', async (kind) => {
    const user = new User(
      'user',
      'Cliente',
      'client@example.test',
      '70000000',
      '',
      'test-hash',
      'CLIENTE',
    );
    const write = {
      court: () => courts.update(new Court(1, 2, 'Norte', 'Futsal', 100)),
      price: () => courts.updatePrice(1, 120),
      complex: () =>
        complexes.update(new Complex(2, 'Complejo', 'La Paz', '70000000')),
      userSave: () => users.save(user),
      userUpdate: () => users.update(user),
      payment: () =>
        payments.update(
          new Payment(4, 'reservation', 50, 'ANTICIPO', 'QR', null, 'PENDING'),
        ),
    }[kind];
    await expect(write()).resolves.toBeUndefined();
    if (kind === 'court')
      expect(stub.query.update).toHaveBeenCalledWith(
        expect.objectContaining({ cover_image_url: null }),
      );
    if (kind === 'price')
      expect(stub.query.update).toHaveBeenCalledWith({ price_per_hour: 120 });
    user.ci = 'historical';
    await write();
    if (kind === 'userSave')
      expect(stub.query.insert).toHaveBeenLastCalledWith(
        expect.objectContaining({ ci: 'historical' }),
      );
    if (kind === 'userUpdate')
      expect(stub.query.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ ci: 'historical' }),
      );
    stub.response.error = { message: 'write failed' };
    await expect(write()).rejects.toThrow('write failed');
  });

  it('busca clientes con filtros y mapea nombres históricos o separados', async () => {
    expect(await users.searchClients('!')).toEqual([]);
    expect(stub.client.from).not.toHaveBeenCalled();
    stub.response.data = [
      { ...userRow, ci: 'historical', first_name: 'Ana', last_name: 'Pérez' },
    ];
    expect(await users.searchClients(' Ana,() ')).toEqual([
      expect.objectContaining({
        firstName: 'Ana',
        lastName: 'Pérez',
        ci: 'historical',
      }),
    ]);
    expect(stub.query.eq).toHaveBeenCalledWith('role', 'CLIENTE');
    expect(stub.query.eq).toHaveBeenCalledWith('status', 'ACTIVE');
    expect(stub.query.or).toHaveBeenCalledWith(
      'name.ilike.%Ana%,phone.ilike.%Ana%,email.ilike.%Ana%',
    );
    expect(stub.query.limit).toHaveBeenCalledWith(20);
    stub.response.data = null;
    expect(await users.searchClients('Ana')).toEqual([]);
    stub.response.error = { message: 'unavailable' };
    await expect(users.searchClients('Ana')).rejects.toThrow(
      'No se pudieron buscar clientes',
    );
  });

  it.each(['reservation', 'pending', 'all', 'handler', 'range'] as const)(
    'lista pagos por %s con éxito, ausencia y error',
    async (kind) => {
      const lookup = {
        reservation: () => payments.findByReservationId('reservation'),
        pending: () => payments.findPendingPayments(),
        all: () => payments.findAll(),
        handler: () => payments.findByHandlerAndDate('staff', '2026-10-14'),
        range: () => payments.findByDateRange('2026-10-13', '2026-10-14'),
      }[kind];
      stub.response.data = [paymentRow];
      expect(await lookup()).toEqual([
        expect.objectContaining({
          amount: 50.25,
          originalReservationId: 'reservation',
          processedAt: null,
        }),
      ]);
      if (kind === 'handler') {
        expect(stub.query.eq).toHaveBeenCalledWith('handled_by', 'staff');
        expect(stub.query.gte).toHaveBeenCalledWith(
          'processed_at',
          '2026-10-14T00:00:00.000-04:00',
        );
      }
      stub.response.data = null;
      expect(await lookup()).toEqual([]);
      stub.response.error = { message: 'read failed' };
      await expect(lookup()).rejects.toThrow('read failed');
    },
  );

  it('mapea pago individual y auditoría de devolución', async () => {
    stub.response.data = {
      ...paymentRow,
      processed_at: timestamp,
      authorized_by: 'admin',
      refund_reason: 'Excepción',
      original_reservation_id: 'original',
    };
    expect(await payments.findById(4)).toMatchObject({
      amount: 50.25,
      processedAt: new Date(timestamp),
      authorizedBy: 'admin',
      refundReason: 'Excepción',
      originalReservationId: 'original',
    });
    stub.response.data = null;
    expect(await payments.findById(4)).toBeNull();
    stub.response.error = { message: 'read failed' };
    await expect(payments.findById(4)).rejects.toThrow('read failed');
  });

  it('envía actor y decisión a los RPC de anticipos y propaga sus errores', async () => {
    stub.response.data = bookingRow;
    const booking = (await bookings.findById('reservation'))!;
    stub.response.data = paymentRow;
    const p = await payments.submitReceipt(booking, 'receipt.png', 'user');
    expect(stub.client.rpc).toHaveBeenCalledWith('submit_advance_receipt', {
      p_reservation: 'reservation',
      p_actor: 'user',
      p_url: 'receipt.png',
    });
    await payments.processAdvance(p, booking);
    expect(stub.client.rpc).toHaveBeenLastCalledWith('process_advance', {
      p_payment_id: 4,
      p_actor: 'staff',
      p_approved: true,
      p_reason: null,
    });
    stub.response.error = { message: 'rpc failed' };
    await expect(
      payments.submitReceipt(booking, 'receipt.png', 'user'),
    ).rejects.toThrow('rpc failed');
    await expect(payments.processAdvance(p, booking)).rejects.toThrow(
      'rpc failed',
    );
  });

  it.each([
    'court',
    'client',
    'pending',
    'temporal',
    'all',
    'range',
    'search',
    'conflicting',
  ] as const)(
    'consulta reservas %s y propaga fallos sin confundirlos con lista vacía',
    async (kind) => {
      const lookup = {
        court: () => bookings.findByCourtAndDate(1, '2026-10-14'),
        client: () => bookings.findByClient('user'),
        pending: () => bookings.findPendingValidation(),
        temporal: () => bookings.findActiveTemporal(),
        all: () => bookings.findAll(),
        range: () => bookings.findByDateRange('2026-10-13', '2026-10-14'),
        search: () => bookings.search({}),
        conflicting: () =>
          bookings.findConflicting(1, '2026-10-14', '10:00', '12:00'),
      }[kind];
      stub.response.data = [bookingRow];
      expect(await lookup()).toEqual([
        expect.objectContaining({
          id: 'reservation',
          startTime: '10:00',
          endTime: '12:00',
          totalPrice: 200,
        }),
      ]);
      stub.response.data = null;
      expect(await lookup()).toEqual([]);
      stub.response.error = { message: 'read failed' };
      await expect(lookup()).rejects.toThrow('read failed');
    },
  );

  it('mapea cobros netos, banderas y datos opcionales de reserva', async () => {
    stub.response.data = {
      ...bookingRow,
      payments: [
        { payment_type: 'ANTICIPO', status: 'VALIDATED', amount: '100' },
        { payment_type: 'SALDO_FINAL', status: 'PENDING', amount: '100' },
        { status: 'REFUNDED', amount: '20' },
      ],
      origin: 'WEB',
      expires_at: timestamp,
    };
    expect(await bookings.findById('reservation')).toMatchObject({
      pendingBalance: 120,
      origin: 'WEB',
      expiresAt: new Date(timestamp),
      isEntryAuthorized: false,
    });
    stub.response.data = {
      ...bookingRow,
      payments: [
        { payment_type: 'SALDO_FINAL', status: 'VALIDATED', amount: '200' },
      ],
      status: 'COMPLETED',
    };
    expect(await bookings.findById('reservation')).toMatchObject({
      pendingBalance: 0,
      isFinalPaymentPaid: true,
      isEntryAuthorized: true,
      origin: 'UNKNOWN',
    });
    stub.response.data = {
      ...bookingRow,
      is_final_payment_paid: true,
      is_entry_authorized: true,
    };
    expect(await bookings.findById('reservation')).toMatchObject({
      isFinalPaymentPaid: true,
      isEntryAuthorized: true,
    });
    stub.response.data = null;
    expect(await bookings.findById('reservation')).toBeNull();
    stub.response.error = { message: 'read failed' };
    await expect(bookings.findById('reservation')).rejects.toThrow(
      'read failed',
    );
  });

  it('aplica filtros y excluye temporales vencidas de conflictos', async () => {
    stub.response.data = [
      bookingRow,
      {
        ...bookingRow,
        id: 'expired',
        status: 'TEMPORAL',
        expires_at: '2000-01-01T12:00:00Z',
      },
      {
        ...bookingRow,
        id: 'active',
        status: 'TEMPORAL',
        expires_at: '2099-01-01T12:00:00Z',
      },
      { ...bookingRow, id: 'no-expiration', status: 'TEMPORAL' },
    ];
    expect(
      (
        await bookings.findConflicting(
          1,
          '2026-10-14',
          '10:00',
          '12:00',
          'exclude',
        )
      ).map((r) => r.id),
    ).toEqual(['reservation', 'active', 'no-expiration']);
    expect(stub.query.neq).toHaveBeenCalledWith('id', 'exclude');
    await bookings.search({
      date: '2026-10-14',
      courtId: 1,
      status: 'CONFIRMED',
      clientId: 'user',
    });
    for (const pair of [
      ['reservation_date', '2026-10-14'],
      ['court_id', 1],
      ['status', 'CONFIRMED'],
      ['client_id', 'user'],
    ])
      expect(stub.query.eq).toHaveBeenCalledWith(...pair);
  });

  it('envía estados esperados, actor y motivo al persistir y reprogramar', async () => {
    const booking = new Reservation(
      'reservation',
      'user',
      1,
      '2026-10-14',
      '10:00',
      '12:00',
      100,
      200,
      50,
      'TEMPORAL',
      new Date(timestamp),
      'staff',
      'parent',
      'reason',
      new Date(timestamp),
      false,
      false,
      'WEB',
    );
    await bookings.save(booking);
    expect(stub.client.rpc).toHaveBeenCalledWith('persist_reservation', {
      p_data: expect.objectContaining({
        expires_at: timestamp,
        parent_reservation_id: 'parent',
        cancellation_reason: 'reason',
        origin: 'WEB',
      }) as unknown,
      p_actor: 'staff',
    });
    await bookings.update(booking, 'admin', 'Cambio');
    expect(stub.client.rpc).toHaveBeenLastCalledWith(
      'persist_reservation',
      expect.objectContaining({
        p_actor: 'admin',
        p_reason: 'Cambio',
        p_expected_status: 'TEMPORAL',
      }),
    );
    await bookings.update(booking);
    expect(stub.client.rpc).toHaveBeenLastCalledWith(
      'persist_reservation',
      expect.objectContaining({ p_actor: null, p_reason: null }),
    );
    await bookings.reschedule(booking, 'admin', 'Cambio');
    expect(stub.client.rpc).toHaveBeenLastCalledWith(
      'reschedule_reservation',
      expect.objectContaining({ p_reason: 'Cambio' }),
    );
    await bookings.reschedule(booking, 'admin');
    expect(stub.client.rpc).toHaveBeenLastCalledWith(
      'reschedule_reservation',
      expect.objectContaining({ p_reason: null }),
    );
  });

  it.each([
    ['23P01', 'CourtSlotOccupiedException'],
    ['40001', 'ConflictException'],
    ['23505', 'ConflictException'],
    ['P0001', 'ValidationException'],
    ['23514', 'ValidationException'],
    ['OTHER', 'Error'],
  ])('traduce error de persistencia %s', async (code, name) => {
    const booking = new Reservation(
      'reservation',
      'user',
      1,
      '2026-10-14',
      '10:00',
      '12:00',
      100,
      200,
      50,
      'CONFIRMED',
      null,
      'staff',
      null,
      null,
      new Date(timestamp),
      false,
      false,
      'UNKNOWN',
    );
    stub.response.error = { code, message: 'write failed' };
    await expect(bookings.save(booking)).rejects.toMatchObject({ name });
    expect(stub.client.rpc).toHaveBeenCalledWith(
      'persist_reservation',
      expect.objectContaining({
        p_data: expect.objectContaining({
          expires_at: null,
          origin: null,
        }) as unknown,
      }),
    );
  });

  it('cuenta reservas liberadas y devuelve cero si no hay datos o falla la actualización', async () => {
    stub.response.data = [{ id: 'a' }, { id: 'b' }];
    expect(await bookings.releaseExpiredReservations()).toBe(2);
    expect(stub.query.update).toHaveBeenCalledWith({ status: 'EXPIRED' });
    stub.response.data = null;
    expect(await bookings.releaseExpiredReservations()).toBe(0);
    stub.response.error = { message: 'update failed' };
    expect(await bookings.releaseExpiredReservations()).toBe(0);
  });
});
