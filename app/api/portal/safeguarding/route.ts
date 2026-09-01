import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";
export async function GET(request:Request){
 const auth=await requireUser(request,["admin","teacher"]);if("response" in auth)return auth.response;
 const admin=auth.user.role==="admin"?1:0;
 const [cases,staff]=await Promise.all([
  env.DB.prepare(`SELECT sc.id,sc.student_id AS studentId,s.full_name AS studentName,s.admission_number AS admissionNumber,sc.concern_type AS concernType,sc.summary,sc.status,sc.restricted,sc.created_at AS createdAt,sc.updated_at AS updatedAt,reporter.full_name AS reportedBy,assignee.full_name AS assignedTo,sc.assigned_to AS assignedToId FROM safeguarding_cases sc LEFT JOIN students s ON s.id=sc.student_id LEFT JOIN users reporter ON reporter.id=sc.reported_by LEFT JOIN users assignee ON assignee.id=sc.assigned_to WHERE (?=1 OR sc.reported_by=? OR sc.assigned_to=?) ORDER BY CASE sc.status WHEN 'open' THEN 0 WHEN 'monitoring' THEN 1 WHEN 'referred' THEN 2 ELSE 3 END,sc.created_at DESC`).bind(admin,auth.user.id,auth.user.id).all(),
  admin?env.DB.prepare(`SELECT id,full_name AS fullName,role FROM users WHERE status='active' AND role IN ('admin','teacher') ORDER BY full_name`).all():Promise.resolve({results:[]})
 ]);
 return Response.json({cases:cases.results,staff:staff.results});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin","teacher"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {studentId?:unknown;concernType?:unknown;summary?:unknown;assignedTo?:unknown};
 const studentId=clean(body.studentId,100),concernType=clean(body.concernType,120),summary=clean(body.summary,3000),requestedAssignee=clean(body.assignedTo,100),assignedTo=auth.user.role==="admin"?requestedAssignee:"";
 if(!concernType||!summary)return Response.json({error:"Enter the concern type and a factual safeguarding summary."},{status:400});
 if(studentId){const student=await env.DB.prepare(`SELECT id FROM students WHERE id=?`).bind(studentId).first();if(!student)return Response.json({error:"The selected pupil was not found."},{status:404})}
 if(assignedTo){const staff=await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status='active' AND role IN ('admin','teacher')`).bind(assignedTo).first();if(!staff)return Response.json({error:"Select an active safeguarding assignee."},{status:400})}
 const id=crypto.randomUUID();await env.DB.prepare(`INSERT INTO safeguarding_cases(id,student_id,concern_type,summary,status,assigned_to,reported_by,restricted) VALUES(?,?,?,?,'open',?,?,1)`).bind(id,studentId||null,concernType,summary,assignedTo||null,auth.user.id).run();
 await audit(auth.user.id,"safeguarding_concern_reported","safeguarding_case",id,JSON.stringify({studentId:studentId||null,concernType}));return Response.json({ok:true,id},{status:201});
}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
