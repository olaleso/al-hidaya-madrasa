import { env } from "cloudflare:workers";
import { audit, requireUser, sameOrigin } from "@/lib/auth";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {studentId?:string;classId?:string};if(!body.studentId||!body.classId)return Response.json({error:"Select both a student and class."},{status:400});
 const existing=await env.DB.prepare(`SELECT id FROM enrolments WHERE student_id=? AND status='active'`).bind(body.studentId).first();if(existing)return Response.json({error:"This student already has an active class enrolment."},{status:409});
 const classRow=await env.DB.prepare(`SELECT capacity,(SELECT COUNT(*) FROM enrolments e WHERE e.class_id=classes.id AND e.status='active') AS enrolled FROM classes WHERE id=? AND active=1`).bind(body.classId).first<{capacity:number;enrolled:number}>();if(!classRow)return Response.json({error:"Class not found."},{status:404});if(Number(classRow.enrolled)>=Number(classRow.capacity))return Response.json({error:"This class is full."},{status:409});
 const id=crypto.randomUUID();await env.DB.prepare(`INSERT INTO enrolments(id,student_id,class_id,start_date,status) VALUES(?,?,?,?, 'active')`).bind(id,body.studentId,body.classId,new Date().toISOString().slice(0,10)).run();await audit(auth.user.id,"student_enrolled","enrolment",id);return Response.json({ok:true,id},{status:201});
}
