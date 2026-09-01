import { env } from "cloudflare:workers";
import { audit,hashPassword,requireUser,sameOrigin,validPassword } from "@/lib/auth";
const roles=new Set(["admin","teacher","finance","parent"]);

export async function GET(request:Request){
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const [users,guardians]=await Promise.all([
  env.DB.prepare(`SELECT u.id,u.email,u.full_name AS fullName,u.phone,u.role,u.status,u.created_at AS createdAt,c.must_change_password AS mustChangePassword,(SELECT COUNT(*) FROM classes cl WHERE cl.teacher_id=u.id AND cl.active=1) AS assignedClasses,g.id AS guardianId FROM users u JOIN user_credentials c ON c.user_id=u.id LEFT JOIN guardians g ON g.user_id=u.id ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'teacher' THEN 1 WHEN 'finance' THEN 2 ELSE 3 END,u.full_name`).all(),
  env.DB.prepare(`SELECT g.id,g.full_name AS fullName,g.email,g.phone,(SELECT group_concat(s.full_name,', ') FROM student_guardians sg JOIN students s ON s.id=sg.student_id WHERE sg.guardian_id=g.id) AS children FROM guardians g WHERE g.user_id IS NULL ORDER BY g.full_name`).all()
 ]);
 return Response.json({users:users.results,unlinkedGuardians:guardians.results});
}

export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {email?:unknown;fullName?:unknown;phone?:unknown;role?:unknown;password?:unknown;guardianId?:unknown};
 const email=clean(body.email,254).toLowerCase(),fullName=clean(body.fullName,160),phone=clean(body.phone,40),role=clean(body.role,20),password=typeof body.password==="string"?body.password:"",guardianId=clean(body.guardianId,100);
 if(!/^\S+@\S+\.\S+$/.test(email)||!fullName||!roles.has(role))return Response.json({error:"Enter a valid name, email address and account role."},{status:400});
 if(!validPassword(password))return Response.json({error:"The temporary password must have at least 12 characters including uppercase, lowercase and a number."},{status:400});
 if(role==="parent"&&!guardianId)return Response.json({error:"Select the guardian record this parent account belongs to."},{status:400});
 if(role==="parent"){
  const guardian=await env.DB.prepare(`SELECT id FROM guardians WHERE id=? AND user_id IS NULL`).bind(guardianId).first();
  if(!guardian)return Response.json({error:"That guardian already has an account or no longer exists."},{status:409});
 }
 const id=crypto.randomUUID(),credential=await hashPassword(password);
 const statements=[
  env.DB.prepare(`INSERT INTO users(id,email,full_name,phone,role,status) VALUES(?,?,?,?,?,'active')`).bind(id,email,fullName,phone||null,role),
  env.DB.prepare(`INSERT INTO user_credentials(user_id,password_hash,password_salt,password_iterations,must_change_password) VALUES(?,?,?,?,1)`).bind(id,credential.hash,credential.salt,credential.iterations)
 ];
 if(role==="parent")statements.push(env.DB.prepare(`UPDATE guardians SET user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id IS NULL`).bind(id,guardianId));
 try{await env.DB.batch(statements)}catch{return Response.json({error:"An account with this email address already exists."},{status:409})}
 await audit(auth.user.id,"user_account_created","user",id,JSON.stringify({role,guardianId:role==="parent"?guardianId:null}));
 return Response.json({ok:true,id,email,role},{status:201});
}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
