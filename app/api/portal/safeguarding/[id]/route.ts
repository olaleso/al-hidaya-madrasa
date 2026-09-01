import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";
const statuses=new Set(["open","monitoring","referred","closed"]);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const {id}=await params;const body=await request.json().catch(()=>({})) as {status?:unknown;assignedTo?:unknown};const status=typeof body.status==="string"?body.status:"",assignedTo=typeof body.assignedTo==="string"?body.assignedTo.trim():"";
 if(!statuses.has(status))return Response.json({error:"Select a valid safeguarding status."},{status:400});
 if(assignedTo){const staff=await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status='active' AND role IN ('admin','teacher')`).bind(assignedTo).first();if(!staff)return Response.json({error:"Select an active safeguarding assignee."},{status:400})}
 const result=await env.DB.prepare(`UPDATE safeguarding_cases SET status=?,assigned_to=?,closed_at=CASE WHEN ?='closed' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,assignedTo||null,status,id).run();
 if(!result.meta.changes)return Response.json({error:"Safeguarding case not found."},{status:404});
 await audit(auth.user.id,"safeguarding_case_updated","safeguarding_case",id,JSON.stringify({status,assignedTo:assignedTo||null}));return Response.json({ok:true,status});
}
