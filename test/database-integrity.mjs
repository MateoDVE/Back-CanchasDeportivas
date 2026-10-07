import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const db=new PGlite({extensions:{btree_gist,pgcrypto}});
const q=(sql,args=[])=>db.query(sql,args);
let passed=0;
async function check(name,fn){ await fn(); console.log('PASS '+name); passed++; }
async function rejects(sql,args=[],pattern){ await assert.rejects(()=>q(sql,args),pattern); }
const migration='supabase/migrations/20260924185608_formal_database_integrity.sql';
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
 await db.exec(await fs.readFile('database/legacy-schema.sql','utf8'));
 await db.exec(await fs.readFile('migrations/20260908_cash_shift_schema.sql','utf8'));
 await db.exec(await fs.readFile(migration,'utf8'));
 await db.exec(await fs.readFile('supabase/migrations/20260924185757_inspection_access_hardening.sql','utf8'));
 console.log('PASS DDL original + migración de caja + migración formal'); passed++;
 const client=randomUUID(),staff=randomUUID(),other=randomUUID();
 for(const [id,role] of [[client,'CLIENTE'],[staff,'SECRETARIA'],[other,'SECRETARIA']]) await q("INSERT INTO users(id,name,email,phone,ci,password_hash,role,status) VALUES($1::uuid,'Test',$1::uuid::text||'@example.invalid','1',left($1::uuid::text,20),'test',$2,'ACTIVE')",[id,role]);
 await q("INSERT INTO complexes(id,name,location) VALUES(1,'Test','Test')");
 await q("INSERT INTO courts(id,complex_id,name,court_type,price_per_hour) VALUES(1,1,'A','Futsal',100),(2,1,'B','Padel',100)");
 await q("SELECT setval('courts_id_seq',2)");
 for(let day=1;day<=7;day++) await q("INSERT INTO court_schedules(court_id,day_of_week,open_time,close_time) VALUES(1,$1,'08:00','23:00'),(2,$1,'08:00','23:00')",[day]);
 const reservation=(time='10:00',end='11:00',extra={})=>({id:randomUUID(),client_id:client,court_id:1,reservation_date:'2030-01-07',start_time:time,end_time:end,price_per_hour:100,total_price:100,advance_required:25,status:'TEMPORAL',created_by:client,origin:'WEB',...extra});
 const save=r=>q('SELECT persist_reservation($1,$2)',[r,r.created_by]);
 const update=(r,status,actor=staff,reason='Prueba')=>q('SELECT persist_reservation($1,$2,$3,$4)',[{...r,status},actor,r.status,reason]);
 const r=reservation();
 await check('Reserva válida y origen persistido',async()=>{await save(r); assert.equal((await q('SELECT origin FROM reservations WHERE id=$1',[r.id])).rows[0].origin,'WEB');});
 await check('Exclusión rechaza solapamientos parciales',()=>assert.rejects(()=>save(reservation('10:30','11:30')),/exclusion|overlap/i));
 await check('Dos solicitudes al mismo bloque: exactamente una se guarda',async()=>{
   const results=await Promise.allSettled([save(reservation('12:00','13:00')),save(reservation('12:00','13:00'))]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 });
 await check('Bloques adyacentes no se solapan',()=>save(reservation('11:00','12:00')));
 await check('Una cancha diferente admite el mismo horario',()=>save(reservation('10:00','11:00',{court_id:2})));
 await check('Presentar comprobante es atómico e idempotente mientras está pendiente',async()=>{
   const receipt=reservation('08:00','09:00'); await save(receipt);
   await q('SELECT submit_advance_receipt($1,$2,$3)',[receipt.id,client,'https://example.invalid/receipt']);
   await q('SELECT submit_advance_receipt($1,$2,$3)',[receipt.id,client,'https://example.invalid/receipt-2']);
   assert.equal((await q('SELECT count(*)::int AS count FROM payments WHERE reservation_id=$1',[receipt.id])).rows[0].count,1);
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[receipt.id])).rows[0].status,'PENDING_VALIDATION');
   const payment=(await q('SELECT id FROM payments WHERE reservation_id=$1',[receipt.id])).rows[0].id;
   await assert.rejects(()=>q('SELECT process_advance($1,$2,false,$3)',[payment,staff,'']),/payments_rejection_reason/);
   assert.equal((await q('SELECT status FROM payments WHERE id=$1',[payment])).rows[0].status,'PENDING');
   await q('SELECT process_advance($1,$2,false,$3)',[payment,staff,'Comprobante ilegible']);
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[receipt.id])).rows[0].status,'CANCELLED');
 });
 await check('Se rechazan 90 minutos, fracciones y anticipo incorrecto',async()=>{
   await assert.rejects(()=>save(reservation('14:00','15:30',{total_price:150,advance_required:37.5})),/reservations_time_valid/);
   await assert.rejects(()=>save(reservation('14:15','15:15')),/reservations_time_valid/);
   await assert.rejects(()=>save(reservation('14:00','15:00',{advance_required:10})),/reservations_amount_valid/);
 });
 await check('Horarios exigen día XOR fecha y son únicos',async()=>{
   await rejects("INSERT INTO court_schedules(court_id,open_time,close_time) VALUES(1,'09:00','10:00')",[],/schedules_calendar_xor/);
   await rejects("INSERT INTO court_schedules(court_id,day_of_week,specific_date,open_time,close_time) VALUES(1,1,'2030-01-07','09:00','10:00')",[],/schedules_calendar_xor/);
   await rejects("INSERT INTO court_schedules(court_id,day_of_week,open_time,close_time) VALUES(1,1,'09:00','10:00')",[],/schedules_weekly_unique/);
 });
 await check('Fecha especial prevalece y el incidente bloquea',async()=>{
   await q("INSERT INTO court_schedules(court_id,specific_date,open_time,close_time) VALUES(1,'2030-02-01','09:00','12:00')");
   await assert.rejects(()=>save(reservation('15:00','16:00',{reservation_date:'2030-02-01'})),/horario/);
   await q("INSERT INTO court_incidents(court_id,start_datetime,end_datetime,reason) VALUES(1,'2030-01-07 16:00-04','2030-01-07 18:00-04','Mantenimiento')");
   await assert.rejects(()=>save(reservation('16:00','17:00')),/incidente/);
   await rejects("INSERT INTO court_incidents(court_id,start_datetime,end_datetime,reason) VALUES(1,'2030-01-07 18:00-04','2030-01-07 16:00-04','Error')",[],/incidents_ordered/);
 });
 await check('Las temporales expiradas liberan el bloque al guardar',async()=>{
   const expired=reservation('19:00','20:00'); await save(expired);
   await q("UPDATE reservations SET expires_at=now()-interval '1 minute' WHERE id=$1",[expired.id]);
   await save(reservation('19:00','20:00'));
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[expired.id])).rows[0].status,'EXPIRED');
 });
 await update(r,'PENDING_VALIDATION',client); r.status='PENDING_VALIDATION';
 const advance=(await q("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status) VALUES($1,25,'ANTICIPO','QR','PENDING') RETURNING id",[r.id])).rows[0].id;
 await check('Anticipo y confirmación se procesan atómicamente con autor y fecha',async()=>{
   await q('SELECT process_advance($1,$2,true)',[advance,staff]); r.status='CONFIRMED';
   const p=(await q('SELECT * FROM payments WHERE id=$1',[advance])).rows[0];
   assert.equal(p.handled_by,staff); assert.ok(p.processed_at);
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[r.id])).rows[0].status,'CONFIRMED');
 });
 await check('La tarifa histórica no cambia con la cancha',async()=>{
   await q('UPDATE courts SET price_per_hour=120 WHERE id=1');
   assert.equal(Number((await q('SELECT price_per_hour FROM reservations WHERE id=$1',[r.id])).rows[0].price_per_hour),100);
   await rejects('UPDATE reservations SET price_per_hour=120,total_price=120,advance_required=30 WHERE id=$1',[r.id],/inmutable/);
 });
 await check('Pago parcial no habilita ingreso ni se acepta como final',async()=>{
   await assert.rejects(()=>update(r,'COMPLETED'),/saldo pendiente/);
   await rejects("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status,handled_by) VALUES($1,1,'SALDO_FINAL','EFECTIVO','VALIDATED',$2)",[r.id,staff],/saldo real/);
 });
 const next=reservation('14:00','15:00',{parent_reservation_id:r.id,status:'CONFIRMED',created_by:staff,origin:'MANUAL'});
 await check('Reprogramar transfiere el dinero y conserva reserva original',async()=>{
   await q('SELECT reschedule_reservation($1,$2,$3)',[next,staff,'Solicitud del cliente']);
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[r.id])).rows[0].status,'REPROGRAMMED');
   const p=(await q('SELECT * FROM payments WHERE id=$1',[advance])).rows[0];
   assert.equal(p.reservation_id,next.id); assert.equal(p.original_reservation_id,r.id);
   assert.equal(Number((await q('SELECT booking_net_paid($1) AS paid',[next.id])).rows[0].paid),25);
 });
 await check('Reprogramación fallida revierte el estado y los pagos',async()=>{
   const collision=reservation('11:00','12:00',{parent_reservation_id:next.id,status:'CONFIRMED',created_by:staff,origin:'MANUAL'});
   await assert.rejects(()=>q('SELECT reschedule_reservation($1,$2)',[collision,staff]),/exclusion|overlap/i);
   assert.equal((await q('SELECT status FROM reservations WHERE id=$1',[next.id])).rows[0].status,'CONFIRMED');
   assert.equal((await q('SELECT reservation_id FROM payments WHERE id=$1',[advance])).rows[0].reservation_id,next.id);
 });
 await check('Devolución exige autorización estructurada y limita el monto',async()=>{
   await rejects("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status,handled_by,authorized_by,refund_reason) VALUES($1,30,'DEVOLUCION','EFECTIVO','REFUNDED',$2,$2,'Excepción')",[next.id,staff],/superior/);
   await rejects("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status,handled_by) VALUES($1,5,'DEVOLUCION','EFECTIVO','REFUNDED',$2)",[next.id,staff],/autorización/);
   await q("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status,handled_by,authorized_by,refund_reason) VALUES($1,5,'DEVOLUCION','EFECTIVO','REFUNDED',$2,$2,'Excepción autorizada')",[next.id,staff]);
   assert.equal(Number((await q('SELECT booking_net_paid($1) AS paid',[next.id])).rows[0].paid),20);
 });
 await check('Saldo exacto permite ingreso con evento de auditoría',async()=>{
   await q("INSERT INTO payments(reservation_id,amount,payment_type,payment_method,status,handled_by) VALUES($1,80,'SALDO_FINAL','EFECTIVO','VALIDATED',$2)",[next.id,staff]);
   await update(next,'COMPLETED'); next.status='COMPLETED';
   const e=(await q("SELECT * FROM reservation_events WHERE reservation_id=$1 AND to_status='COMPLETED'",[next.id])).rows[0];
   assert.equal(e.actor_id,staff); assert.ok(e.occurred_at);
   await rejects("UPDATE reservation_events SET reason='alterado' WHERE id=$1",[e.id],/inmutable/);
 });
 await check('Auditoría de inasistencia no depende de texto opcional',async()=>{
   const absent=reservation('21:00','22:00',{status:'CONFIRMED',created_by:staff,origin:'WHATSAPP'}); await save(absent);
   await update(absent,'NO_SHOW',staff,null);
   assert.equal((await q("SELECT actor_id FROM reservation_events WHERE reservation_id=$1 AND to_status='NO_SHOW'",[absent.id])).rows[0].actor_id,staff);
 });
 await check('Cierre calcula su caja neta, no la de otra persona, y queda inmutable',async()=>{
   const day=(await q("SELECT (now() AT TIME ZONE 'America/La_Paz')::date AS day")).rows[0].day;
   const shift=(await q('INSERT INTO cash_shifts(secretary_id,shift_date,total_system,total_declared_cash) VALUES($1,$2,999,75) RETURNING *',[staff,day])).rows[0];
   assert.equal(Number(shift.total_system_cash),75); assert.equal(Number(shift.total_system_qr),25); assert.equal(Number(shift.difference),0);
   const otherShift=(await q('INSERT INTO cash_shifts(secretary_id,shift_date,total_system,total_declared_cash) VALUES($1,$2,999,0) RETURNING *',[other,day])).rows[0];
   assert.equal(Number(otherShift.total_system),0);
   await rejects('UPDATE cash_shifts SET total_declared_cash=0 WHERE id=$1',[shift.id],/inmutable/);
   await rejects('DELETE FROM cash_shifts WHERE id=$1',[shift.id],/inmutable/);
 });
 await check('Catálogo permite otro deporte sin alterar tablas',async()=>{
   await q("INSERT INTO court_types(code,description) VALUES('Tenis','Tenis')");
   await q("INSERT INTO courts(complex_id,name,court_type,price_per_hour) VALUES(1,'Tenis','Tenis',100)");
   await rejects("INSERT INTO courts(complex_id,name,court_type,price_per_hour) VALUES(1,'Error','NoExiste',100)",[],/foreign key/);
 });
 await check('RLS y RPC no exponen escrituras a clientes directos',async()=>{
   const {rows}=await q("SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('users','courts','reservations','payments','cash_shifts','reservation_events','court_types') AND relnamespace='public'::regnamespace");
   assert.ok(rows.every(r=>r.relrowsecurity));
   assert.equal((await q("SELECT has_function_privilege('anon','public.persist_reservation(jsonb,uuid,text,text)','EXECUTE') AS allowed")).rows[0].allowed,false);
 });
 await check('RPC funciona con los permisos reales de service_role',async()=>{
   await db.exec('SET ROLE service_role');
   try { await save(reservation('09:00','10:00',{reservation_date:'2030-03-01'})); }
   finally { await db.exec('RESET ROLE'); }
 });
 console.log(`\n${passed} verificaciones PostgreSQL correctas. Motor PGlite; no conexión a producción.`);
} catch(error) { console.error('FAIL',error.message,error.detail ?? '',error.where ?? ''); process.exitCode=1; }
finally { await db.close(); }
