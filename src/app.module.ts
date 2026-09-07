import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplexesModule } from './modules/complexes/complexes.module';
import { CourtsModule } from './modules/courts/courts.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CashShiftsModule } from './modules/cash-shifts/cash-shifts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    UsersModule,
    AuthModule,
    ComplexesModule,
    CourtsModule,
    SchedulesModule,
    ReservationsModule,
    PaymentsModule,
    CashShiftsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
