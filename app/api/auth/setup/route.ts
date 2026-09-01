import { env } from "cloudflare:workers";
import { audit, hashPassword, sameOrigin, validPassword } from "@/lib/auth";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const runtime=env as typeof env&{ADMIN_SETUP_TOKEN?:string}; const supplied=request.headers.get("x-setup-token")||"";
 if(!runtime.ADMIN_SETUP_TOKEN||supplied!==runtime.ADMIN_SETUP_TOKEN)return Response.json({error:"Initial setup is not authorised."},{status:403});
 const existing=await env.DB.prepare(`SELECT COUNT(*) AS count FROM user_credentials`).first<{count:number}>();
 if(Number(existing?.count||0)>0)return Response.json({error:"Initial setup has already been completed."},{status:409});
 const body=await request.json().catch(()=>({})) as {email?:string;fullName?:string;password?:string};
 const email=(body.email||"").trim().toLowerCase(),fullName=(body.fullName||"").trim(),password=body.password||"";
 if(!email.includes("@")||!fullName)return Response.json({error:"A valid name and email are required."},{status:400});
 if(!validPassword(password))return Response.json({error:"Use at least 12 characters including uppercase, lowercase and a number."},{status:400});
 const id=crypto.randomUUID(),credential=await hashPassword(password);
 await env.DB.batch([env.DB.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'admin','active')`).bind(id,email,fullName),env.DB.prepare(`INSERT INTO user_credentials(user_id,password_hash,password_salt,password_iterations) VALUES(?,?,?,?)`).bind(id,credential.hash,credential.salt,credential.iterations)]);
 await audit(id,"initial_admin_created","user",id); return Response.json({ok:true,email},{status:201});
}
