import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

function applyMigration(db,file){for(const statement of readFileSync(new URL(`../drizzle/${file}`,import.meta.url),"utf8").split("--> statement-breakpoint").map(x=>x.trim()).filter(Boolean))db.exec(statement)}
const migrations=["0000_oval_slayback.sql","0001_application_details.sql","0002_email_password_auth.sql","0003_operations_backend.sql"];

test("admission converts atomically into guardian, student and class enrolment",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");
 for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO applications(id,child_name,date_of_birth,gender,programme,guardian_name,guardian_email,guardian_phone,address,postcode,status) VALUES(?,?,?,?,?,?,?,?,?,?,'offered')`).run("app-1","Maryam Ali","2018-05-10","female","Qur’an Foundation","Aisha Ali","aisha@example.test","07123456789","1 Bolton Road","BL1 1AA");
 db.prepare(`INSERT INTO classes(id,name,programme,room,day_of_week,start_time,end_time,capacity,active) VALUES(?,?,?,?,?,?,?,?,1)`).run("class-1","Foundation A","Qur’an Foundation","Room 1",6,"09:00","10:30",20);
 db.exec("BEGIN");
 db.prepare(`INSERT INTO guardians(id,full_name,email,phone,address) VALUES(?,?,?,?,?)`).run("guardian-1","Aisha Ali","aisha@example.test","07123456789","1 Bolton Road");
 db.prepare(`INSERT INTO students(id,admission_number,full_name,date_of_birth,gender,status) VALUES(?,?,?,?,?,'active')`).run("student-1","AHM-2026-ABC123","Maryam Ali","2018-05-10","female");
 db.prepare(`INSERT INTO student_guardians(student_id,guardian_id,relationship,is_primary,collection_authorised) VALUES(?,?,?,1,1)`).run("student-1","guardian-1","Parent");
 db.prepare(`INSERT INTO enrolments(id,student_id,class_id,start_date,status) VALUES(?,?,?,?,'active')`).run("enrol-1","student-1","class-1","2026-09-01");
 db.prepare(`UPDATE applications SET status='enrolled' WHERE id=?`).run("app-1");db.exec("COMMIT");
 const record=db.prepare(`SELECT s.full_name AS child,g.full_name AS guardian,c.name AS className,a.status FROM students s JOIN student_guardians sg ON sg.student_id=s.id JOIN guardians g ON g.id=sg.guardian_id JOIN enrolments e ON e.student_id=s.id JOIN classes c ON c.id=e.class_id JOIN applications a ON a.id='app-1'`).get();
 assert.deepEqual({...record},{child:"Maryam Ali",guardian:"Aisha Ali",className:"Foundation A",status:"enrolled"});
});

test("authentication migration creates credential and session tables",()=>{
 const db=new DatabaseSync(":memory:");
 for(const file of migrations)applyMigration(db,file);
 const names=db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user_credentials','auth_sessions','password_reset_tokens') ORDER BY name`).all().map(x=>x.name);
 assert.deepEqual(names,["auth_sessions","password_reset_tokens","user_credentials"]);
 const credentialColumns=db.prepare(`PRAGMA table_info(user_credentials)`).all().map(x=>x.name);
 assert.ok(credentialColumns.includes("must_change_password"));
});

test("attendance register can be saved and amended without duplicate rows",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");
 for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'admin','active')`).run("admin-1","admin@example.test","Admin User");
 db.prepare(`INSERT INTO students(id,admission_number,full_name,date_of_birth,status) VALUES(?,?,?,?,'active')`).run("student-1","AHM-2026-001","Maryam Ali","2018-05-10");
 db.prepare(`INSERT INTO classes(id,name,programme,day_of_week,start_time,end_time,capacity,active) VALUES(?,?,?,?,?,?,?,1)`).run("class-1","Foundation A","Qur’an Foundation",6,"09:00","10:30",20);
 db.prepare(`INSERT INTO enrolments(id,student_id,class_id,start_date,status) VALUES(?,?,?,?,'active')`).run("enrol-1","student-1","class-1","2026-09-01");
 const save=db.prepare(`INSERT INTO attendance(id,student_id,class_id,attendance_date,status,check_in_time,recorded_by,notes) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(student_id,class_id,attendance_date) DO UPDATE SET status=excluded.status,check_in_time=excluded.check_in_time,recorded_by=excluded.recorded_by,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`);
 save.run("att-1","student-1","class-1","2026-09-01","present","09:01","admin-1",null);save.run("att-2","student-1","class-1","2026-09-01","late","09:12","admin-1","Traffic delay");
 const rows=db.prepare(`SELECT status,check_in_time AS checkInTime,notes FROM attendance WHERE student_id=? AND class_id=? AND attendance_date=?`).all("student-1","class-1","2026-09-01");
 assert.equal(rows.length,1);assert.deepEqual({...rows[0]},{status:"late",checkInTime:"09:12",notes:"Traffic delay"});
});

test("fee account integrity and partial-to-paid payment workflow",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'finance','active')`).run("finance-1","finance@example.test","Finance User");
 db.prepare(`INSERT INTO students(id,admission_number,full_name,date_of_birth,status) VALUES(?,?,?,?,'active')`).run("student-1","AHM-2026-001","Maryam Ali","2018-05-10");
 db.prepare(`INSERT INTO fee_accounts(id,student_id,term,amount_due_pence,status) VALUES(?,?,?,?,'unpaid')`).run("fee-1","student-1","Autumn 2026",10000);
 assert.throws(()=>db.prepare(`INSERT INTO fee_accounts(id,student_id,term,amount_due_pence,status) VALUES(?,?,?,?,'unpaid')`).run("fee-2","student-1","Autumn 2026",10000));
 db.prepare(`INSERT INTO payments(id,fee_account_id,amount_pence,paid_at,method,reference,recorded_by) VALUES(?,?,?,?,?,?,?)`).run("payment-1","fee-1",4000,"2026-09-01","bank_transfer","REF-001","finance-1");
 db.prepare(`UPDATE fee_accounts SET amount_paid_pence=4000,status='part_paid' WHERE id='fee-1'`).run();
 db.prepare(`INSERT INTO payments(id,fee_account_id,amount_pence,paid_at,method,reference,recorded_by) VALUES(?,?,?,?,?,?,?)`).run("payment-2","fee-1",6000,"2026-09-02","cash","REF-002","finance-1");
 db.prepare(`UPDATE fee_accounts SET amount_paid_pence=10000,status='paid' WHERE id='fee-1'`).run();
 const account=db.prepare(`SELECT amount_paid_pence AS paid,status FROM fee_accounts WHERE id='fee-1'`).get();assert.deepEqual({...account},{paid:10000,status:"paid"});
});

test("parent account links to one guardian and starts with forced password change",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO guardians(id,full_name,email,phone) VALUES(?,?,?,?)`).run("guardian-1","Aisha Ali","aisha@example.test","07123456789");
 db.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'parent','active')`).run("parent-1","aisha@example.test","Aisha Ali");
 db.prepare(`INSERT INTO user_credentials(user_id,password_hash,password_salt,password_iterations,must_change_password) VALUES(?,?,?,?,1)`).run("parent-1","hash","salt",100000);
 db.prepare(`UPDATE guardians SET user_id=? WHERE id=? AND user_id IS NULL`).run("parent-1","guardian-1");
 const linked=db.prepare(`SELECT g.user_id AS userId,c.must_change_password AS mustChange FROM guardians g JOIN user_credentials c ON c.user_id=g.user_id WHERE g.id=?`).get("guardian-1");assert.deepEqual({...linked},{userId:"parent-1",mustChange:1});
});

test("teacher assignment count follows active class assignments",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'teacher','active')`).run("teacher-1","teacher@example.test","Teacher User");
 db.prepare(`INSERT INTO classes(id,name,programme,teacher_id,day_of_week,start_time,end_time,capacity,active) VALUES(?,?,?,?,?,?,?,?,1)`).run("class-1","Foundation A","Qur’an Foundation","teacher-1",6,"09:00","10:30",20);
 const count=db.prepare(`SELECT COUNT(*) AS assignedClasses FROM classes WHERE teacher_id=? AND active=1`).get("teacher-1");assert.equal(count.assignedClasses,1);
});

test("family announcement recipients are unique guardians of actively enrolled pupils",()=>{
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");for(const file of migrations)applyMigration(db,file);
 db.prepare(`INSERT INTO guardians(id,full_name,email,phone) VALUES(?,?,?,?)`).run("guardian-1","Aisha Ali","AISHA@example.test","07123456789");
 db.prepare(`INSERT INTO students(id,admission_number,full_name,date_of_birth,status) VALUES(?,?,?,?,'active')`).run("student-1","AHM-2026-001","Maryam Ali","2018-05-10");
 db.prepare(`INSERT INTO classes(id,name,programme,day_of_week,start_time,end_time,capacity,active) VALUES(?,?,?,?,?,?,?,1)`).run("class-1","Foundation A","Qur’an Foundation",6,"09:00","10:30",20);
 db.prepare(`INSERT INTO student_guardians(student_id,guardian_id,relationship,is_primary,collection_authorised) VALUES(?,?,?,1,1)`).run("student-1","guardian-1","Parent");
 db.prepare(`INSERT INTO enrolments(id,student_id,class_id,start_date,status) VALUES(?,?,?,?,'active')`).run("enrol-1","student-1","class-1","2026-09-01");
 const recipients=db.prepare(`SELECT lower(trim(g.email)) AS email,MIN(g.full_name) AS fullName FROM guardians g JOIN student_guardians sg ON sg.guardian_id=g.id JOIN students s ON s.id=sg.student_id WHERE s.status='active' AND instr(g.email,'@')>1 AND EXISTS(SELECT 1 FROM enrolments e WHERE e.student_id=s.id AND e.status='active') GROUP BY lower(trim(g.email)) ORDER BY lower(trim(g.email))`).all();
 assert.deepEqual(recipients.map(row=>({...row})),[{email:"aisha@example.test",fullName:"Aisha Ali"}]);
});
