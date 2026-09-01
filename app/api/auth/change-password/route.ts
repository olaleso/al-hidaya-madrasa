import { env } from "cloudflare:workers";
import { audit, destroySession, hashPassword, requireUser, sameOrigin, validPassword, verifyPassword } from "@/lib/auth";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
  const auth=await requireUser(request);if("response" in auth)return auth.response;
  const body=await request.json().catch(()=>({})) as {currentPassword?:string;newPassword?:string};
  if(!validPassword(body.newPassword||""))return Response.json({error:"Use at least 12 characters including uppercase, lowercase and a number."},{status:400});
  const credential=await env.DB.prepare(`SELECT password_hash AS passwordHash,password_salt AS passwordSalt,password_iterations AS passwordIterations FROM user_credentials WHERE user_id=?`).bind(auth.user.id).first<{passwordHash:string;passwordSalt:string;passwordIterations:number}>();
  if(!credential||!await verifyPassword(body.currentPassword||"",credential.passwordHash,credential.passwordSalt,credential.passwordIterations))return Response.json({error:"Current password is incorrect."},{status:400});
  const next=await hashPassword(body.newPassword!);
  await env.DB.batch([env.DB.prepare(`UPDATE user_credentials SET password_hash=?,password_salt=?,password_iterations=?,password_changed_at=CURRENT_TIMESTAMP,failed_attempts=0,locked_until=NULL,must_change_password=0 WHERE user_id=?`).bind(next.hash,next.salt,next.iterations,auth.user.id),env.DB.prepare(`DELETE FROM auth_sessions WHERE user_id=?`).bind(auth.user.id)]);
  await audit(auth.user.id,"password_changed","user",auth.user.id);
  const response=Response.json({ok:true});response.headers.set("Set-Cookie",await destroySession(request));return response;
}
