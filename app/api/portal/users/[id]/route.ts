import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const {id}=await params;if(id===auth.user.id)return Response.json({error:"You cannot disable your own administrator account."},{status:400});
 const body=await request.json().catch(()=>({})) as {status?:unknown};const status=body.status;
 if(status!=="active"&&status!=="disabled")return Response.json({error:"Select a valid account status."},{status:400});
 const result=await env.DB.prepare(`UPDATE users SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,id).run();
 if(!result.meta.changes)return Response.json({error:"User account not found."},{status:404});
 if(status==="disabled")await env.DB.prepare(`DELETE FROM auth_sessions WHERE user_id=?`).bind(id).run();
 await audit(auth.user.id,"user_status_changed","user",id,String(status));return Response.json({ok:true,status});
}
