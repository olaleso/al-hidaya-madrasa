import { env } from "cloudflare:workers";

const COOKIE = "ahm_session";
// Cloudflare Workers currently supports PBKDF2 iteration counts up to 100,000.
// Keep local and production credentials compatible with the same runtime.
const ITERATIONS = 100_000;
const SESSION_DAYS = 7;

export type AuthUser = { id:string; email:string; fullName:string; role:"admin"|"teacher"|"finance"|"parent"; mustChangePassword:boolean };

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, c => c.charCodeAt(0));
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(hash));
}

export async function hashPassword(password: string, salt = randomToken(24), iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt:base64ToBytes(salt.replaceAll("-", "+").replaceAll("_", "/") + "==".slice((salt.length + 3) % 4)), iterations }, key, 256);
  return { hash:bytesToBase64(new Uint8Array(bits)), salt, iterations };
}

export async function verifyPassword(password:string, expected:string, salt:string, iterations:number) {
  const actual = (await hashPassword(password, salt, iterations)).hash;
  if (actual.length !== expected.length) return false;
  let different = 0;
  for (let i=0; i<actual.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0;
}

export function validPassword(password:string) {
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export function isLocalhostRequest(request:Request) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function cookieValue(request:Request) {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1] || null;
}

export async function currentUser(request:Request):Promise<AuthUser|null> {
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = await digest(token);
  const row = await env.DB.prepare(`SELECT u.id,u.email,u.full_name AS fullName,u.role,c.must_change_password AS mustChangePassword FROM auth_sessions s JOIN users u ON u.id=s.user_id JOIN user_credentials c ON c.user_id=u.id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.status='active'`).bind(tokenHash).first<AuthUser>();
  if (row) env.DB.prepare(`UPDATE auth_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?`).bind(tokenHash).run().catch(()=>{});
  return row || null;
}

export async function requireUser(request:Request, roles?:AuthUser["role"][]) {
  const user = await currentUser(request);
  if (!user) return { response:Response.json({error:"Authentication required."},{status:401}) };
  if (roles && !roles.includes(user.role)) return { response:Response.json({error:"You do not have permission to perform this action."},{status:403}) };
  return { user };
}

export async function createSession(request:Request, userId:string) {
  const token = randomToken(32);
  const tokenHash = await digest(token);
  const expires = new Date(Date.now()+SESSION_DAYS*86400000);
  await env.DB.prepare(`INSERT INTO auth_sessions(id,user_id,token_hash,expires_at,user_agent,ip_address) VALUES(?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),userId,tokenHash,expires.toISOString(),request.headers.get("user-agent")?.slice(0,500)||null,request.headers.get("cf-connecting-ip")||null).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}${secure}`;
}

export async function destroySession(request:Request) {
  const token = cookieValue(request);
  if (token) await env.DB.prepare(`DELETE FROM auth_sessions WHERE token_hash=?`).bind(await digest(token)).run();
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function audit(actorId:string|null, action:string, entityType:string, entityId:string|null, detail?:string) {
  await env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),actorId,action,entityType,entityId,detail||null).run();
}

export function sameOrigin(request:Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
