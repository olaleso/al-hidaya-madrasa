import { env } from "cloudflare:workers";
import { audit, requireUser, sameOrigin } from "@/lib/auth";
const allowed=["new","reviewing","offered","waitlisted","declined"];
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const {id}=await params;const body=await request.json().catch(()=>({})) as {status?:string};
 if(!allowed.includes(body.status||""))return Response.json({error:"Select a valid application status."},{status:400});
 const result=await env.DB.prepare(`UPDATE applications SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='enrolled'`).bind(body.status,id).run();
 if(!result.meta.changes)return Response.json({error:"Application was not found or is already enrolled."},{status:404});
 await audit(auth.user.id,"application_status_changed","application",id,body.status);return Response.json({ok:true,status:body.status});
}
