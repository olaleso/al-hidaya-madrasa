import { env } from "cloudflare:workers";
import { audit, createSession, hashPassword, isLocalhostRequest, sameOrigin, validPassword, verifyPassword } from "@/lib/auth";

type LoginRow = {
  id:string;
  email:string;
  fullName:string;
  role:string;
  status:string;
  passwordHash:string;
  passwordSalt:string;
  passwordIterations:number;
  failedAttempts:number;
  lockedUntil:string|null;
  mustChangePassword:boolean;
};

type LocalRuntime = typeof env & {
  LOCAL_DEV_LOGIN?:string;
  LOCAL_DEV_ADMIN_EMAIL?:string;
  LOCAL_DEV_ADMIN_PASSWORD?:string;
  LOCAL_DEV_ADMIN_NAME?:string;
};

export async function POST(request:Request) {
  try {
    if (!sameOrigin(request)) return Response.json({error:"Invalid request."},{status:403});
    const body = await request.json().catch(() => ({})) as {email?:string;password?:string};
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) return Response.json({error:"Enter your email address and password."},{status:400});

    await repairLocalDevelopmentAdmin(request, email, password);

    const row = await env.DB.prepare(`SELECT u.id,u.email,u.full_name AS fullName,u.role,u.status,c.password_hash AS passwordHash,c.password_salt AS passwordSalt,c.password_iterations AS passwordIterations,c.failed_attempts AS failedAttempts,c.locked_until AS lockedUntil,c.must_change_password AS mustChangePassword FROM users u JOIN user_credentials c ON c.user_id=u.id WHERE lower(u.email)=?`).bind(email).first<LoginRow>();
    const invalid = () => Response.json({error:"Email or password is incorrect."},{status:401});
    if (!row || row.status !== "active") return invalid();
    if (row.lockedUntil && new Date(row.lockedUntil) > new Date()) return Response.json({error:"This account is temporarily locked. Please try again later."},{status:423});
    if (row.passwordIterations > 100_000) {
      return Response.json({error:"This local password uses an older format. Enable LOCAL_DEV_LOGIN in .dev.vars to repair it, then restart the server."},{status:409});
    }
    if (!await verifyPassword(password,row.passwordHash,row.passwordSalt,row.passwordIterations)) {
      const attempts = (row.failedAttempts || 0) + 1;
      const lock = attempts >= 5 ? new Date(Date.now()+15*60000).toISOString() : null;
      await env.DB.prepare(`UPDATE user_credentials SET failed_attempts=?,locked_until=? WHERE user_id=?`).bind(lock?0:attempts,lock,row.id).run();
      await audit(row.id,"login_failed","user",row.id);
      return invalid();
    }
    await env.DB.prepare(`UPDATE user_credentials SET failed_attempts=0,locked_until=NULL WHERE user_id=?`).bind(row.id).run();
    await env.DB.prepare(`DELETE FROM auth_sessions WHERE expires_at<=CURRENT_TIMESTAMP`).run();
    await audit(row.id,"login_succeeded","user",row.id);
    const response = Response.json({user:{id:row.id,email:row.email,fullName:row.fullName,role:row.role,mustChangePassword:Boolean(row.mustChangePassword)}});
    response.headers.set("Set-Cookie",await createSession(request,row.id));
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return Response.json({error:"The sign-in service could not complete the request. Please try again."},{status:500});
  }
}

async function repairLocalDevelopmentAdmin(request:Request, email:string, password:string) {
  const runtime = env as LocalRuntime;
  if (!isLocalhostRequest(request) || runtime.LOCAL_DEV_LOGIN !== "enabled") return;
  const expectedEmail = (runtime.LOCAL_DEV_ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = runtime.LOCAL_DEV_ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPassword || email !== expectedEmail || password !== expectedPassword) return;
  if (!validPassword(password)) throw new Error("LOCAL_DEV_ADMIN_PASSWORD does not meet the password policy.");

  const existing = await env.DB.prepare(`SELECT id FROM users WHERE lower(email)=?`).bind(email).first<{id:string}>();
  const userId = existing?.id || crypto.randomUUID();
  const credential = await hashPassword(password);
  const displayName = (runtime.LOCAL_DEV_ADMIN_NAME || "Local Administrator").trim().slice(0,200);

  if (existing) {
    await env.DB.prepare(`UPDATE users SET full_name=?,role='admin',status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(displayName,userId).run();
  } else {
    await env.DB.prepare(`INSERT INTO users(id,email,full_name,role,status) VALUES(?,?,?,'admin','active')`).bind(userId,email,displayName).run();
  }
  await env.DB.prepare(`INSERT INTO user_credentials(user_id,password_hash,password_salt,password_iterations,password_changed_at,failed_attempts,locked_until,must_change_password) VALUES(?,?,?,?,CURRENT_TIMESTAMP,0,NULL,0) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash,password_salt=excluded.password_salt,password_iterations=excluded.password_iterations,password_changed_at=CURRENT_TIMESTAMP,failed_attempts=0,locked_until=NULL,must_change_password=0`).bind(userId,credential.hash,credential.salt,credential.iterations).run();
  await env.DB.prepare(`DELETE FROM auth_sessions WHERE user_id=?`).bind(userId).run();
}
