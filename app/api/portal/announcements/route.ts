import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";
const audiences=new Set(["all","parents","staff"]);
type ParentRecipient={email:string;fullName:string};
type EmailDelivery={status:"sent"|"partial"|"failed"|"not_configured"|"no_recipients"|"not_applicable";recipients:number;sent:number};
export async function GET(request:Request){
 const auth=await requireUser(request);if("response" in auth)return auth.response;
 const role=auth.user.role,audience=role==="parent"?"parents":"staff",isAdmin=role==="admin"?1:0;
 const rows=await env.DB.prepare(`SELECT a.id,a.title,a.body,a.audience,a.published_at AS publishedAt,a.expires_at AS expiresAt,a.created_at AS createdAt,u.full_name AS publishedBy FROM announcements a LEFT JOIN users u ON u.id=a.published_by WHERE (?=1 OR (a.published_at IS NOT NULL AND (a.expires_at IS NULL OR date(a.expires_at)>=date('now')) AND a.audience IN ('all',?))) ORDER BY COALESCE(a.published_at,a.created_at) DESC`).bind(isAdmin,audience).all();
 return Response.json({announcements:rows.results});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {title?:unknown;body?:unknown;audience?:unknown;expiresAt?:unknown};
 const title=clean(body.title,160),message=clean(body.body,3000),audience=clean(body.audience,20),expiresAt=clean(body.expiresAt,10);
 if(!title||!message||!audiences.has(audience))return Response.json({error:"Enter a title, message and valid audience."},{status:400});
 if(expiresAt&&(!validDate(expiresAt)||expiresAt<today()))return Response.json({error:"The expiry date cannot be in the past."},{status:400});
 const id=crypto.randomUUID();await env.DB.prepare(`INSERT INTO announcements(id,title,body,audience,published_by,published_at,expires_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,?)`).bind(id,title,message,audience,auth.user.id,expiresAt||null).run();
 const emailDelivery=await emailParents(request,{id,title,message,audience});
 await audit(auth.user.id,"announcement_published","announcement",id,JSON.stringify({audience,title,emailDelivery}));return Response.json({ok:true,id,emailDelivery},{status:201});
}

async function emailParents(request:Request,announcement:{id:string;title:string;message:string;audience:string}):Promise<EmailDelivery>{
 if(announcement.audience==="staff")return{status:"not_applicable",recipients:0,sent:0};
 const recipients=await env.DB.prepare(`SELECT lower(trim(g.email)) AS email,MIN(g.full_name) AS fullName FROM guardians g JOIN student_guardians sg ON sg.guardian_id=g.id JOIN students s ON s.id=sg.student_id WHERE s.status='active' AND instr(g.email,'@')>1 AND EXISTS(SELECT 1 FROM enrolments e WHERE e.student_id=s.id AND e.status='active') GROUP BY lower(trim(g.email)) ORDER BY lower(trim(g.email))`).all<ParentRecipient>();
 const people=recipients.results;if(!people.length)return{status:"no_recipients",recipients:0,sent:0};
 const runtimeEnv=env as typeof env&{RESEND_API_KEY?:string;EMAIL_FROM?:string};
 if(!runtimeEnv.RESEND_API_KEY)return{status:"not_configured",recipients:people.length,sent:0};
 const from=runtimeEnv.EMAIL_FROM||"Al-Hidaya Madrasah <admissions@alhidayaislamiccentre.org>",portalUrl=new URL("/portal",request.url).toString(),subject=`Al-Hidaya Madrasah: ${announcement.title}`;
 let sent=0;
 for(let start=0;start<people.length;start+=100){
  const group=people.slice(start,start+100),payload=group.map(person=>announcementEmail({person,from,subject,title:announcement.title,message:announcement.message,portalUrl}));
  try{const response=await fetch("https://api.resend.com/emails/batch",{method:"POST",headers:{Authorization:`Bearer ${runtimeEnv.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`announcement-${announcement.id}-${start/100}`},body:JSON.stringify(payload)});if(response.ok)sent+=group.length}catch{/* The portal announcement remains available if email delivery fails. */}
 }
 return{status:sent===people.length?"sent":sent?"partial":"failed",recipients:people.length,sent};
}

function announcementEmail(details:{person:ParentRecipient;from:string;subject:string;title:string;message:string;portalUrl:string}){
 const name=escapeHtml(details.person.fullName),title=escapeHtml(details.title),message=escapeHtml(details.message).replace(/\n/g,"<br>"),portalUrl=escapeHtml(details.portalUrl);
 return{from:details.from,to:[details.person.email],reply_to:"alhidayatulummaha@gmail.com",subject:details.subject,text:`Assalamu alaikum ${details.person.fullName},\n\n${details.title}\n\n${details.message}\n\nThis announcement is also available in the parent portal: ${details.portalUrl}\n\nAl-Hidaya Madrasah\n66 Chorley Street, Bolton BL1 4AL`,html:`<!doctype html><html><body style="margin:0;background:#f5f1e7;font-family:Arial,sans-serif;color:#18251f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#1d201e;padding:28px;text-align:center;color:#fff"><h1 style="margin:0;font-family:Georgia,serif;font-size:28px">Al-Hidaya Madrasah</h1><p style="margin:8px 0 0;color:#d5ad3f">Parent announcement</p></td></tr><tr><td style="padding:32px"><p>Assalamu alaikum ${name},</p><h2 style="font-family:Georgia,serif;color:#1d201e">${title}</h2><p style="line-height:1.7">${message}</p><p style="margin:28px 0"><a href="${portalUrl}" style="display:inline-block;padding:13px 20px;background:#d5ad3f;color:#151815;text-decoration:none;border-radius:8px;font-weight:700">Open parent portal</a></p><p>Was-salamu alaikum,<br><strong>Al-Hidaya Madrasah</strong></p></td></tr><tr><td style="padding:20px 32px;background:#f8f4e9;font-size:12px;line-height:1.6;color:#626a65">Al-Hidaya Islamic Centre<br>66 Chorley Street, Bolton BL1 4AL</td></tr></table></td></tr></table></body></html>`};
}

function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(`${value}T00:00:00Z`);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
function today(){return new Date().toISOString().slice(0,10)}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]||character)}
