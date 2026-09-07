import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalDomainExceptionFilter } from '../src/common/filters/domain-exception.filter';

describe('Flujo Completo de Historias de Usuario (Backend E2E)', () => {
  let app: INestApplication;

  // Variables compartidas a lo largo de las 6 fases
  let adminToken: string;
  let clientToken: string;
  let secretaryToken: string;
  let createdComplexId: number;
  let createdCourtId: number;
  let reservationId: string;
  let pendingPaymentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalDomainExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // FASE 1: Configuración base (Admin) — sin esto nada funciona
  // =========================================================================
  describe('1. Configuración base (Admin)', () => {
    it('HU-ADM-01: Iniciar sesión como Administrador', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@canchas.com',
          password: 'Admin123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('ADMIN');
      adminToken = response.body.accessToken;
    });

    it('HU-ADM-03: Crear complejo deportivo', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/complexes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Complejo Deportivo Las Palmas',
          location: 'Av. Circunvalación #890',
          contactInfo: '71122334',
          paymentQrUrl: 'https://images.canchas.com/qr-las-palmas.png',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Complejo Deportivo Las Palmas');
      expect(response.body.isActive).toBe(true);
      createdComplexId = response.body.id;
    });

    it('HU-ADM-06: Registrar cancha', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/courts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          complexId: createdComplexId,
          name: 'Cancha Futsal Las Palmas A',
          courtType: 'Futsal',
          pricePerHour: 90.0,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.complexId).toBe(createdComplexId);
      expect(response.body.pricePerHour).toBe(90.0);
      createdCourtId = response.body.id;
    });

    it('HU-ADM-08: Configurar precio por hora', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/courts/${createdCourtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pricePerHour: 100.0,
        })
        .expect(200);

      expect(response.body.pricePerHour).toBe(100.0);
    });

    it('HU-ADM-13: Configurar horarios de atención', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/courts/${createdCourtId}/schedules/weekly`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schedules: [
            { dayOfWeek: 1, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 2, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 3, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 4, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 5, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 6, openTime: '08:00', closeTime: '23:00' },
            { dayOfWeek: 7, openTime: '08:00', closeTime: '23:00' },
          ],
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(7);
      expect(response.body[0].openTime).toBe('08:00');
    });
  });

  // =========================================================================
  // FASE 2: Acceso y exploración (Cliente)
  // =========================================================================
  describe('2. Acceso y exploración (Cliente)', () => {
    const clientEmail = `cliente_${Date.now()}@gmail.com`;

    it('HU-CLI-01: Registro de nuevo cliente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Carlos Mendoza',
          email: clientEmail,
          phone: '78899001',
          ci: `CI-${Date.now()}`,
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(clientEmail);
      expect(response.body.role).toBe('CLIENTE');
    });

    it('HU-CLI-03: Inicio de sesión del cliente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: clientEmail,
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('CLIENTE');
      clientToken = response.body.accessToken;
    });

    it('HU-CLI-04: Consultar complejos deportivos activos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/complexes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find((c: any) => c.id === createdComplexId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Complejo Deportivo Las Palmas');
    });

    it('HU-CLI-05: Consultar canchas del complejo seleccionado', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/complexes/${createdComplexId}/courts`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find((c: any) => c.id === createdCourtId);
      expect(found).toBeDefined();
      expect(found.courtType).toBe('Futsal');
      expect(found.pricePerHour).toBe(100.0);
    });

    it('HU-CLI-08: Consultar disponibilidad por fecha', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/courts/${createdCourtId}/availability?date=2026-09-15`)
        .expect(200);

      expect(response.body.isOpen).toBe(true);
      expect(Array.isArray(response.body.slots)).toBe(true);
      expect(response.body.slots.length).toBeGreaterThan(0);
      const firstSlot = response.body.slots[0];
      expect(firstSlot.isAvailable).toBe(true);
      expect(firstSlot.status).toBe('AVAILABLE');
    });
  });

  // =========================================================================
  // FASE 3: Núcleo de la reserva (Cliente) — el corazón del producto
  // =========================================================================
  describe('3. Núcleo de la reserva (Cliente)', () => {
    it('HU-CLI-10: Rechazar selección de horario fraccionado o < 1h', async () => {
      // Intento de reservar 30 minutos (08:00 a 08:30)
      const res30Min = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          courtId: createdCourtId,
          date: '2026-09-15',
          startTime: '08:00',
          endTime: '08:30',
        })
        .expect(400);

      expect(res30Min.body.message).toContain('duración mínima');
    });

    it('HU-CLI-11 & HU-CLI-12: Solicitar reserva de 2 horas con bloqueo temporal de 5 min', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          courtId: createdCourtId,
          date: '2026-09-15',
          startTime: '18:00',
          endTime: '20:00',
        })
        .expect(201);

      expect(response.body).toHaveProperty('reservationId');
      expect(response.body.status).toBe('TEMPORAL');
      expect(response.body.durationHours).toBe(2);
      expect(response.body.pricePerHour).toBe(100.0);
      // Total = 2 * 100 = 200
      expect(response.body.totalPrice).toBe(200.0);
      // Anticipo 25% = 50.0
      expect(response.body.advanceRequired).toBe(50.0);
      // Saldo pendiente = 150.0
      expect(response.body.pendingBalance).toBe(150.0);
      expect(response.body.secondsRemaining).toBeGreaterThan(280);

      reservationId = response.body.reservationId;
    });

    it('HU-CLI-12: Comprobar que el horario queda bloqueado y previene colisiones', async () => {
      // Intentar reservar un horario que se solape (ej. 19:00 a 21:00)
      const collisionRes = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          courtId: createdCourtId,
          date: '2026-09-15',
          startTime: '19:00',
          endTime: '21:00',
        })
        .expect(409);

      expect(collisionRes.body.statusCode).toBe(409);
      expect(collisionRes.body.message).toContain('ocupado o bloqueado');
    });

    it('HU-CLI-13 & HU-CLI-14: Consultar resumen de reserva y anticipo requerido (25%)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reservations/${reservationId}/summary`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.id).toBe(reservationId);
      expect(response.body.complex.name).toBe('Complejo Deportivo Las Palmas');
      expect(response.body.court.name).toBe('Cancha Futsal Las Palmas A');
      expect(response.body.totalPrice).toBe(200.0);
      expect(response.body.advanceRequired).toBe(50.0);
      expect(response.body.pendingBalance).toBe(150.0);
      expect(response.body.status).toBe('TEMPORAL');
    });
  });

  // =========================================================================
  // FASE 4: Pago del anticipo (Cliente)
  // =========================================================================
  describe('4. Pago del anticipo (Cliente)', () => {
    it('HU-CLI-15: Realizar pago del anticipo (consultar QR del complejo)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/complexes/${createdComplexId}/qr`)
        .expect(200);

      expect(response.body.complexId).toBe(createdComplexId);
      expect(response.body.paymentQrUrl).toBe('https://images.canchas.com/qr-las-palmas.png');
    });

    it('HU-CLI-16: Adjuntar comprobante de pago del 25%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/payments/${reservationId}/receipt`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          receiptImageUrl: 'https://storage.supabase.co/payment-receipts/comprobante-transferencia-qr.jpg',
        })
        .expect(200);

      expect(response.body).toHaveProperty('paymentId');
      expect(response.body.amount).toBe(50.0); // 25% del total
      expect(response.body.paymentType).toBe('ANTICIPO');
      expect(response.body.paymentMethod).toBe('QR');
      expect(response.body.paymentStatus).toBe('PENDING');
      expect(response.body.reservationStatus).toBe('PENDING_VALIDATION');

      pendingPaymentId = response.body.paymentId;
    });
  });

  // =========================================================================
  // FASE 5: Cierre del ciclo (Secretaria) — sin esto la reserva nunca se confirma
  // =========================================================================
  describe('5. Cierre del ciclo (Secretaria)', () => {
    it('HU-SEC-01: Iniciar sesión como Secretaria', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'secretaria@canchas.com',
          password: 'Secre123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('SECRETARIA');
      secretaryToken = response.body.accessToken;
    });

    it('HU-SEC-07 & HU-SEC-08: Consultar solicitudes pendientes y visualizar comprobante', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/secretary/payments/pending')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find((p: any) => p.paymentId === pendingPaymentId);
      expect(found).toBeDefined();
      expect(found.reservationStatus).toBe('PENDING_VALIDATION');
      expect(found.amount).toBe(50.0);
      expect(found.receiptImageUrl).toBe(
        'https://storage.supabase.co/payment-receipts/comprobante-transferencia-qr.jpg',
      );
      expect(found.client).not.toBeNull();
      expect(found.court).not.toBeNull();
    });

    it('HU-SEC-09: Validar anticipo y confirmar la reserva', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/secretary/payments/${pendingPaymentId}/validate`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .expect(200);

      expect(response.body.paymentId).toBe(pendingPaymentId);
      expect(response.body.paymentStatus).toBe('VALIDATED');
      expect(response.body.reservationStatus).toBe('CONFIRMED');
      expect(response.body.handledBy).toBeDefined();
    });
  });

  // =========================================================================
  // FASE 6: Verificación mínima (Cliente)
  // =========================================================================
  describe('6. Verificación mínima (Cliente)', () => {
    it('HU-CLI-18: Consultar estado de reserva confirmada', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reservations/${reservationId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.id).toBe(reservationId);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('HU-CLI-19: Consultar mis reservas (debe aparecer en próximas)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/client/my-reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('upcoming');
      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.upcoming)).toBe(true);

      const found = response.body.upcoming.find((r: any) => r.id === reservationId);
      expect(found).toBeDefined();
      expect(found.status).toBe('CONFIRMED');
      expect(found.totalPrice).toBe(200.0);
      expect(found.advanceRequired).toBe(50.0);
      expect(found.pendingBalance).toBe(150.0);
    });
  });
});
