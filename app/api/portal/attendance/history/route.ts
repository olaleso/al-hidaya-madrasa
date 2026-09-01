import { env } from "cloudflare:workers";
import { requireUser } from "@/lib/auth";
export async function GET(request:Request){
 const auth=await requireUser(request,["parent"]);if("response" in auth)return auth.response;
 const rows=await env.DB.prepare(`SELECT a.id,a.attendance_date AS attendanceDate,a.status,a.check_in_time AS checkInTime,a.notes,s.id AS studentId,s.full_name AS studentName,s.admission_number AS admissionNumber,c.name AS className FROM attendance a JOIN students s ON s.id=a.student_id JOIN classes c ON c.id=a.class_id JOIN student_guardians sg ON sg.student_id=s.id JOIN guardians g ON g.id=sg.guardian_id WHERE g.user_id=? AND date(a.attendance_date)>=date('now','-120 days') ORDER BY a.attendance_date DESC,s.full_name`).bind(auth.user.id).all();
 return Response.json({attendance:rows.results});
}
