import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface';
import { InMemoryPaymentRepository } from './infrastructure/repositories/in-memory-payment.repository';
import { SupabasePaymentRepository } from './infrastructure/repositories/supabase-payment.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';

import { UploadReceiptUseCase } from './application/use-cases/upload-receipt.use-case';
import { GetPendingPaymentsUseCase } from './application/use-cases/get-pending-payments.use-case';
import { ValidateAdvancePaymentUseCase } from './application/use-cases/validate-advance-payment.use-case';
import { GetPaymentStatusUseCase } from './application/use-cases/get-payment-status.use-case';
import { RejectAdvancePaymentUseCase } from './application/use-cases/reject-advance-payment.use-case';
import { RegisterFinalPaymentUseCase } from './application/use-cases/register-final-payment.use-case';
import { RegisterRefundExceptionUseCase } from './application/use-cases/register-refund-exception.use-case';

import { PaymentsController } from './presentation/controllers/payments.controller';
import { SecretaryPaymentsController } from './presentation/controllers/secretary-payments.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { CourtsModule } from '../courts/courts.module';
import { ComplexesModule } from '../complexes/complexes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ReservationsModule, CourtsModule, ComplexesModule, UsersModule],
  controllers: [PaymentsController, SecretaryPaymentsController],
  providers: [
    InMemoryPaymentRepository,
    {
      provide: PAYMENT_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryPaymentRepository,
      ) => {
        if (supabase) {
          return new SupabasePaymentRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryPaymentRepository],
    },
    UploadReceiptUseCase,
    GetPendingPaymentsUseCase,
    ValidateAdvancePaymentUseCase,
    GetPaymentStatusUseCase,
    RejectAdvancePaymentUseCase,
    RegisterFinalPaymentUseCase,
    RegisterRefundExceptionUseCase,
  ],
  exports: [
    PAYMENT_REPOSITORY,
    UploadReceiptUseCase,
    GetPendingPaymentsUseCase,
    ValidateAdvancePaymentUseCase,
    GetPaymentStatusUseCase,
    RejectAdvancePaymentUseCase,
    RegisterFinalPaymentUseCase,
    RegisterRefundExceptionUseCase,
  ],
})
export class PaymentsModule {}
