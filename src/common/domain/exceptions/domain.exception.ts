export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class CourtSlotOccupiedException extends ConflictException {
  constructor(message = 'El horario seleccionado ya se encuentra ocupado o bloqueado.') {
    super(message);
  }
}

export class ValidationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidReservationDurationException extends ValidationException {
  constructor(message = 'La duración debe ser de al menos 1 hora y en bloques enteros.') {
    super(message);
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message = 'No autorizado.') {
    super(message);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message = 'Acceso denegado.') {
    super(message);
  }
}
