import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
const files=['database/legacy-schema.sql','migrations/20260908_cash_shift_schema.sql','supabase/migrations/20260924185608_formal_database_integrity.sql','supabase/migrations/20260924185757_inspection_access_hardening.sql','supabase/migrations/20261009161546_email_verification_and_half_hour_bookings.sql'];
files.push('supabase/migrations/20261009161634_bounded_types_and_table_audit.sql');
const source=(await Promise.all(files.map(f=>fs.readFile(f,'utf8')))).join('\n\n');
await fs.writeFile('database/schema.sql','-- GENERADO por npm run db:schema. Solo para una base VACÍA con roles Supabase.\n-- Para una base existente use únicamente la migración formal después de preflight.\n'+source);
const db=new PGlite({extensions:{btree_gist,pgcrypto}});
try{
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
 await db.exec(source);
 const {rows:columns}=await db.query("SELECT c.table_name,c.column_name,c.is_nullable,c.column_default,pg_catalog.format_type(a.atttypid,a.atttypmod) AS physical_type FROM information_schema.columns c JOIN pg_catalog.pg_attribute a ON a.attrelid=(quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass AND a.attname=c.column_name WHERE c.table_schema='public' AND c.table_name IN ('audit_log','users','complexes','courts','court_types','court_schedules','court_incidents','reservations','reservation_events','payments','cash_shifts') ORDER BY c.table_name,c.ordinal_position");
 const {rows:constraints}=await db.query("SELECT c.conrelid::regclass::text AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition,c.convalidated FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY table_name,c.conname");
 const clean=s=>String(s??'—').replaceAll('|','\\|').replaceAll('\n',' ');
 let md='# Diccionario físico y restricciones — generado del motor PostgreSQL\n\nFuente: `database/schema.sql`, reproducida por `npm run db:schema`. No describe la base remota hasta aplicar la migración.\n\n';
 for(const table of [...new Set(columns.map(c=>c.table_name))]){
   md+=`## ${table}\n\n| Columna | Tipo | Nulo | Valor predeterminado |\n|---|---|---|---|\n`;
   for(const c of columns.filter(c=>c.table_name===table)){
     const type=c.physical_type;
     md+=`| ${c.column_name} | ${type} | ${c.is_nullable} | ${clean(c.column_default)} |\n`;
   }
   md+='\n| Restricción | Definición | Validada en datos existentes |\n|---|---|---|\n';
   for(const c of constraints.filter(c=>c.table_name===table))md+=`| ${c.conname} | ${clean(c.definition)} | ${c.convalidated?'Sí':'No: transición de datos históricos; nuevas escrituras controladas'} |\n`;
   md+='\n';
 }
 await fs.mkdir('docs/inspeccion',{recursive:true});
 await fs.writeFile('docs/inspeccion/diccionario-datos.md',md);
 console.log('DDL y diccionario generados y ejecutados correctamente en PostgreSQL local.');
} catch(e){console.error(e.message);process.exitCode=1;} finally{await db.close();}
