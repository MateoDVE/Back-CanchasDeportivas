-- DDL original conservado para reproducción y migración de la inspección.
-- Habilitar extensión pgcrypto para gen_random_uuid si no estuviera activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- Módulo 1: Usuarios y Autenticación
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,      -- 'CLIENTE', 'SECRETARIA', 'ADMIN'
    status VARCHAR(20) NOT NULL,    -- 'ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Módulo 2: Infraestructura Deportiva
-- ==========================================
CREATE TABLE complexes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_info TEXT,
    payment_qr_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courts (
    id SERIAL PRIMARY KEY,
    complex_id INT NOT NULL REFERENCES complexes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    court_type VARCHAR(50) NOT NULL, -- 'Futsal', 'Wally', 'Racket'
    price_per_hour NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE court_schedules (
    id SERIAL PRIMARY KEY,
    court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo. NULL si specific_date tiene valor.
    specific_date DATE, -- Para excepciones y horarios especiales en días puntuales
    open_time TIME NOT NULL,
    close_time TIME NOT NULL
);

CREATE TABLE court_incidents (
    id SERIAL PRIMARY KEY,
    court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    reason TEXT NOT NULL
);

-- ==========================================
-- Módulo 3: Reservas
-- ==========================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id),
    court_id INT NOT NULL REFERENCES courts(id),
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_hour NUMERIC(10,2) NOT NULL, -- Precio congelado al momento de reservar
    total_price NUMERIC(10,2) NOT NULL,
    advance_required NUMERIC(10,2) NOT NULL, -- Exactamente 25% del total_price
    status VARCHAR(30) NOT NULL,    -- 'TEMPORAL', 'PENDING_VALIDATION', 'CONFIRMED', 'CANCELLED', 'REPROGRAMMED', 'EXPIRED', 'NO_SHOW', 'COMPLETED'
    expires_at TIMESTAMP,           -- Timestamp de expiración para el bloqueo temporal de 5 minutos
    created_by UUID NOT NULL REFERENCES users(id), -- Cliente o Secretaria
    parent_reservation_id UUID REFERENCES reservations(id), -- Trazabilidad de reprogramaciones
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Módulo 4: Financiero y de Caja
-- ==========================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,   -- 'ANTICIPO', 'SALDO_FINAL'
    payment_method VARCHAR(20) NOT NULL, -- 'QR', 'EFECTIVO'
    receipt_image_url VARCHAR(255),
    status VARCHAR(20) NOT NULL,         -- 'PENDING', 'VALIDATED', 'REJECTED'
    handled_by UUID REFERENCES users(id),-- Secretaria que validó o cobró presencialmente
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_shifts (
    id SERIAL PRIMARY KEY,
    secretary_id UUID NOT NULL REFERENCES users(id),
    shift_date DATE NOT NULL,
    total_system NUMERIC(10,2) NOT NULL,   -- Suma de pagos en efectivo registrados en sistema
    total_declared NUMERIC(10,2) NOT NULL, -- Monto contado físicamente por la secretaria
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
