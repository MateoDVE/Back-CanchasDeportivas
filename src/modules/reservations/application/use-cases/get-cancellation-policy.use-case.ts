import { Injectable } from '@nestjs/common';

export interface CancellationPolicyOutputDto {
  title: string;
  policy: string;
  advanceRefundable: boolean;
  rescheduleAllowed: boolean;
  conditions: string[];
}

/**
 * @reference HU-CLI-22 Consultar política de cancelación
 * @reference RN-08 Política de anticipo no reembolsable
 */
@Injectable()
export class GetCancellationPolicyUseCase {
  execute(): CancellationPolicyOutputDto {
    return {
      title: 'Políticas Generales de Cancelación y Reprogramación',
      policy:
        'Por política de los establecimientos deportivos, el anticipo del 25% NO es reembolsable en cancelaciones voluntarias realizadas por el cliente.',
      advanceRefundable: false,
      rescheduleAllowed: true,
      conditions: [
        'Las cancelaciones deben notificarse con la debida anticipación para liberar la cancha.',
        'El anticipo pagado no será devuelto en efectivo ni por transferencia, salvo excepción especial debidamente autorizada por la administración.',
        'Las reprogramaciones deben ser coordinadas y autorizadas directamente con la administración o la secretaria del complejo.',
        'En caso de reprogramación autorizada, el 100% del anticipo previamente pagado se transfiere a la nueva fecha u horario acordado.',
      ],
    };
  }
}
