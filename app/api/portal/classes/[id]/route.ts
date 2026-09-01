import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const {id}=await params;const body=await request.json().catch(()=>({})) as {teacherId?:unknown};const teacherId=typeof body.teacherId==="string"?body.teacherId.trim():"";
 if(teacherId){const teacher=await env.DB.prepare(`SELECT id FROM users WHERE id=? AND role='teacher' AND status='active'`).bind(teacherId).first();if(!teacher)return Response.json({error:"Select an active teacher account."},{status:400})}
 const result=await env.DB.prepare(`UPDATE classes SET teacher_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(teacherId||null,id).run();
 if(!result.meta.changes)return Response.json({error:"Class not found."},{status:404});
 await audit(auth.user.id,"class_teacher_assigned","class",id,teacherId||"unassigned");return Response.json({ok:true,teacherId:teacherId||null});
}
