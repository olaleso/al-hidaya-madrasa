import { env } from "cloudflare:workers";
import { audit, requireUser, sameOrigin } from "@/lib/auth";
export async function GET(request:Request){
 const auth=await requireUser(request,["admin","teacher"]);if("response" in auth)return auth.response;
 const rows=await env.DB.prepare(`SELECT c.id,c.name,c.programme,c.room,c.teacher_id AS teacherId,c.day_of_week AS dayOfWeek,c.start_time AS startTime,c.end_time AS endTime,c.capacity,c.active,u.full_name AS teacherName,(SELECT COUNT(*) FROM enrolments e WHERE e.class_id=c.id AND e.status='active') AS enrolled FROM classes c LEFT JOIN users u ON u.id=c.teacher_id WHERE (?='admin' OR c.teacher_id=?) ORDER BY c.active DESC,c.day_of_week,c.start_time,c.name`).bind(auth.user.role,auth.user.id).all();
 return Response.json({classes:rows.results});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 const name=clean(body.name),programme=clean(body.programme),room=clean(body.room),startTime=clean(body.startTime),endTime=clean(body.endTime),dayOfWeek=Number(body.dayOfWeek),capacity=Number(body.capacity);
 if(!name||!programme||!startTime||!endTime||!Number.isInteger(dayOfWeek)||dayOfWeek<0||dayOfWeek>6||!Number.isInteger(capacity)||capacity<1||capacity>100)return Response.json({error:"Complete all class details with a capacity between 1 and 100."},{status:400});
 if(startTime>=endTime)return Response.json({error:"Class end time must be later than its start time."},{status:400});
 const id=crypto.randomUUID();await env.DB.prepare(`INSERT INTO classes(id,name,programme,room,day_of_week,start_time,end_time,capacity,active) VALUES(?,?,?,?,?,?,?,?,1)`).bind(id,name,programme,room||null,dayOfWeek,startTime,endTime,capacity).run();
 await audit(auth.user.id,"class_created","class",id,name);return Response.json({ok:true,id},{status:201});
}
function clean(v:unknown){return typeof v==='string'?v.trim().slice(0,200):''}
