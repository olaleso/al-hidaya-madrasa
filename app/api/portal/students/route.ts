import { env } from "cloudflare:workers";
import { requireUser } from "@/lib/auth";
export async function GET(request:Request){
 const auth=await requireUser(request,["admin","teacher","finance","parent"]);if("response" in auth)return auth.response;
 const parent=auth.user.role==="parent"?1:0,teacher=auth.user.role==="teacher"?1:0;
 const rows=await env.DB.prepare(`SELECT s.id,s.admission_number AS admissionNumber,s.full_name AS fullName,s.date_of_birth AS dateOfBirth,s.gender,s.status,g.id AS guardianId,g.full_name AS guardianName,g.email AS guardianEmail,g.phone AS guardianPhone,g.user_id AS guardianUserId,c.name AS className,e.id AS enrolmentId FROM students s LEFT JOIN student_guardians sg ON sg.student_id=s.id AND sg.is_primary=1 LEFT JOIN guardians g ON g.id=sg.guardian_id LEFT JOIN enrolments e ON e.student_id=s.id AND e.status='active' LEFT JOIN classes c ON c.id=e.class_id WHERE (?=0 OR g.user_id=?) AND (?=0 OR c.teacher_id=?) ORDER BY s.full_name`).bind(parent,auth.user.id,teacher,auth.user.id).all();
 return Response.json({students:rows.results});
}
