import { env } from "cloudflare:workers";
import { requireUser } from "@/lib/auth";

export async function GET(request:Request){
 const auth=await requireUser(request,["admin","teacher","finance"]);if("response" in auth)return auth.response;
 const url=new URL(request.url),download=url.searchParams.get("download");
 if(download)return downloadReport(download,auth.user.id,auth.user.role);
 const teacher=auth.user.role==="teacher"?1:0,canSeeFees=auth.user.role==="admin"||auth.user.role==="finance";
 const [students,classes,attendance,feeTotals,feeStatuses,applications]=await Promise.all([
  env.DB.prepare(`SELECT COUNT(DISTINCT s.id) AS count FROM students s LEFT JOIN enrolments e ON e.student_id=s.id AND e.status='active' LEFT JOIN classes c ON c.id=e.class_id WHERE s.status='active' AND (?=0 OR c.teacher_id=?)`).bind(teacher,auth.user.id).first<{count:number}>(),
  env.DB.prepare(`SELECT COUNT(*) AS count FROM classes WHERE active=1 AND (?=0 OR teacher_id=?)`).bind(teacher,auth.user.id).first<{count:number}>(),
  env.DB.prepare(`SELECT a.attendance_date AS date,SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) AS late,SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absent,SUM(CASE WHEN a.status='authorised' THEN 1 ELSE 0 END) AS authorised FROM attendance a JOIN classes c ON c.id=a.class_id WHERE date(a.attendance_date)>=date('now','-29 days') AND (?=0 OR c.teacher_id=?) GROUP BY a.attendance_date ORDER BY a.attendance_date`).bind(teacher,auth.user.id).all(),
  canSeeFees?env.DB.prepare(`SELECT COALESCE(SUM(amount_due_pence),0) AS due,COALESCE(SUM(amount_paid_pence),0) AS paid,COALESCE(SUM(amount_due_pence-amount_paid_pence),0) AS outstanding,SUM(CASE WHEN status NOT IN ('paid','waived') AND due_date<date('now') THEN 1 ELSE 0 END) AS overdue FROM fee_accounts`).first():Promise.resolve({due:0,paid:0,outstanding:0,overdue:0}),
  canSeeFees?env.DB.prepare(`SELECT status,COUNT(*) AS count FROM fee_accounts GROUP BY status ORDER BY status`).all():Promise.resolve({results:[]}),
  auth.user.role==="admin"?env.DB.prepare(`SELECT status,COUNT(*) AS count FROM applications GROUP BY status ORDER BY status`).all():Promise.resolve({results:[]})
 ]);
 return Response.json({activeStudents:Number(students?.count||0),activeClasses:Number(classes?.count||0),attendance:attendance.results,fees:{due:Number((feeTotals as Record<string,unknown>)?.due||0),paid:Number((feeTotals as Record<string,unknown>)?.paid||0),outstanding:Number((feeTotals as Record<string,unknown>)?.outstanding||0),overdue:Number((feeTotals as Record<string,unknown>)?.overdue||0),statuses:feeStatuses.results},applications:applications.results,role:auth.user.role});
}

async function downloadReport(type:string,userId:string,role:"admin"|"teacher"|"finance"|"parent"){
 let headers:string[]=[],rows:unknown[][]=[],filename="report.csv";
 if(type==="students"){
  const teacher=role==="teacher"?1:0;const result=await env.DB.prepare(`SELECT s.admission_number,s.full_name,s.date_of_birth,s.gender,s.status,c.name AS class_name,g.full_name AS guardian_name,g.email AS guardian_email,g.phone AS guardian_phone FROM students s LEFT JOIN student_guardians sg ON sg.student_id=s.id AND sg.is_primary=1 LEFT JOIN guardians g ON g.id=sg.guardian_id LEFT JOIN enrolments e ON e.student_id=s.id AND e.status='active' LEFT JOIN classes c ON c.id=e.class_id WHERE (?=0 OR c.teacher_id=?) ORDER BY s.full_name`).bind(teacher,userId).all();headers=["Admission number","Pupil","Date of birth","Gender","Status","Class","Guardian","Guardian email","Guardian phone"];rows=result.results.map(row=>Object.values(row));filename="students-report.csv";
 }else if(type==="fees"){
  if(role!=="admin"&&role!=="finance")return Response.json({error:"You do not have permission to download the fees report."},{status:403});
  const result=await env.DB.prepare(`SELECT s.admission_number,s.full_name,f.term,f.amount_due_pence,f.amount_paid_pence,(f.amount_due_pence-f.amount_paid_pence) AS balance_pence,f.due_date,f.status FROM fee_accounts f JOIN students s ON s.id=f.student_id ORDER BY f.due_date,s.full_name`).all();headers=["Admission number","Pupil","Term","Amount due (pence)","Amount paid (pence)","Balance (pence)","Due date","Status"];rows=result.results.map(row=>Object.values(row));filename="fees-report.csv";
 }else if(type==="attendance"){
  if(role!=="admin"&&role!=="teacher")return Response.json({error:"You do not have permission to download the attendance report."},{status:403});
  const teacher=role==="teacher"?1:0;const result=await env.DB.prepare(`SELECT a.attendance_date,s.admission_number,s.full_name,c.name AS class_name,a.status,a.check_in_time,a.notes FROM attendance a JOIN students s ON s.id=a.student_id JOIN classes c ON c.id=a.class_id WHERE (?=0 OR c.teacher_id=?) ORDER BY a.attendance_date DESC,c.name,s.full_name`).bind(teacher,userId).all();headers=["Date","Admission number","Pupil","Class","Status","Check-in","Notes"];rows=result.results.map(row=>Object.values(row));filename="attendance-report.csv";
 }else return Response.json({error:"Select a valid report."},{status:400});
 const csv=[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n");return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${filename}"`}});
}
function csvCell(value:unknown){const text=value===null||value===undefined?"":String(value);return `"${text.replaceAll('"','""')}"`}
