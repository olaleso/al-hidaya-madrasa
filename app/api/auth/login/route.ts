import { env } from "cloudflare:workers";
import { audit, createSession, sameOrigin, verifyPassword } from "@/lib/auth";

export async function POST(request:Request) {
  if (!sameOrigin(request)) return Response.json({error:"Invalid request."},{status:403});
  const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
  const email=(body.email||"").trim().toLowerCase();
  const password=body.password||"";
  type LoginRow={id:string;email:string;fullName:string;role:string;status:string;passwordHash:string;passwordSalt:string;passwordIterations:number;failedAttempts:number;lockedUntil:string|null;mustChangePassword:boolean};
  const row=await env.DB.prepare(`SELECT u.id,u.email,u.full_name AS fullName,u.role,u.status,c.password_hash AS passwordHash,c.password_salt AS passwordSalt,c.password_iterations AS passwordIterations,c.failed_attempts AS failedAttempts,c.locked_until AS lockedUntil,c.must_change_password AS mustChangePassword FROM users u JOIN user_credentials c ON c.user_id=u.id WHERE u.email=?`).bind(email).first<LoginRow>();
  const invalid=()=>Response.json({error:"Email or password is incorrect."},{status:401});
  if(!row || row.status!=="active") return invalid();
  if(row.lockedUntil && new Date(row.lockedUntil)>new Date()) return Response.json({error:"This account is temporarily locked. Please try again later."},{status:423});
  if(!await verifyPassword(password,row.passwordHash,row.passwordSalt,row.passwordIterations)){
    const attempts=(row.failedAttempts||0)+1;
    const lock=attempts>=5?new Date(Date.now()+15*60000).toISOString():null;
    await env.DB.prepare(`UPDATE user_credentials SET failed_attempts=?,locked_until=? WHERE user_id=?`).bind(lock?0:attempts,lock,row.id).run();
    await audit(row.id,"login_failed","user",row.id);
    return invalid();
  }
  await env.DB.prepare(`UPDATE user_credentials SET failed_attempts=0,locked_until=NULL WHERE user_id=?`).bind(row.id).run();
  await env.DB.prepare(`DELETE FROM auth_sessions WHERE expires_at<=CURRENT_TIMESTAMP`).run();
  await audit(row.id,"login_succeeded","user",row.id);
  const response=Response.json({user:{id:row.id,email:row.email,fullName:row.fullName,role:row.role,mustChangePassword:Boolean(row.mustChangePassword)}});
  response.headers.set("Set-Cookie",await createSession(request,row.id));
  return response;
}
