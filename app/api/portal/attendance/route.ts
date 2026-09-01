import { env } from "cloudflare:workers";
import { requireUser, sameOrigin } from "@/lib/auth";

type AttendanceStatus = "present" | "late" | "absent" | "authorised";
type AttendanceEntry = { studentId?:unknown; status?:unknown; checkInTime?:unknown; notes?:unknown };
const statuses = new Set<AttendanceStatus>(["present","late","absent","authorised"]);

export async function GET(request:Request){
 const auth=await requireUser(request,["admin","teacher"]);if("response" in auth)return auth.response;
 const url=new URL(request.url),classId=clean(url.searchParams.get("classId"),100),attendanceDate=clean(url.searchParams.get("date"),10);
 if(!classId||!validDate(attendanceDate))return Response.json({error:"Select a class and a valid attendance date."},{status:400});
 const classRecord=await accessibleClass(classId,auth.user.id,auth.user.role);
 if(!classRecord)return Response.json({error:"The class was not found or is not assigned to your account."},{status:404});
 const rows=await roster(classId,attendanceDate);
 return Response.json({class:classRecord,attendanceDate,students:rows.results});
}

export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin","teacher"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {classId?:unknown;attendanceDate?:unknown;entries?:AttendanceEntry[]};
 const classId=clean(body.classId,100),attendanceDate=clean(body.attendanceDate,10);
 if(!classId||!validDate(attendanceDate))return Response.json({error:"Select a class and a valid attendance date."},{status:400});
 if(attendanceDate>today())return Response.json({error:"Attendance cannot be recorded for a future date."},{status:400});
 const classRecord=await accessibleClass(classId,auth.user.id,auth.user.role);
 if(!classRecord)return Response.json({error:"The class was not found or is not assigned to your account."},{status:404});
 const currentRoster=await roster(classId,attendanceDate),rosterIds=currentRoster.results.map(row=>String(row.studentId));
 if(rosterIds.length===0)return Response.json({error:"There are no active pupils enrolled in this class for the selected date."},{status:400});
 const entries=Array.isArray(body.entries)?body.entries:[];
 if(entries.length!==rosterIds.length||entries.length>100)return Response.json({error:"The class roster has changed. Refresh the register and try again."},{status:409});
 const rosterSet=new Set(rosterIds),seen=new Set<string>(),validated:Array<{studentId:string;status:AttendanceStatus;checkInTime:string|null;notes:string|null}>=[];
 for(const entry of entries){
  const studentId=clean(entry.studentId,100),status=clean(entry.status,20) as AttendanceStatus,checkInTime=clean(entry.checkInTime,5),notes=clean(entry.notes,500);
  if(!studentId||!rosterSet.has(studentId)||seen.has(studentId))return Response.json({error:"The class roster has changed. Refresh the register and try again."},{status:409});
  if(!statuses.has(status))return Response.json({error:"Mark every pupil as present, late, absent or authorised absence."},{status:400});
  if(checkInTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime))return Response.json({error:"Enter a valid check-in time or leave it blank."},{status:400});
  seen.add(studentId);validated.push({studentId,status,checkInTime:status==="present"||status==="late"?checkInTime||null:null,notes:notes||null});
 }
 const statements=validated.map(entry=>env.DB.prepare(`INSERT INTO attendance(id,student_id,class_id,attendance_date,status,check_in_time,recorded_by,notes) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(student_id,class_id,attendance_date) DO UPDATE SET status=excluded.status,check_in_time=excluded.check_in_time,recorded_by=excluded.recorded_by,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(),entry.studentId,classId,attendanceDate,entry.status,entry.checkInTime,auth.user.id,entry.notes));
 statements.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),auth.user.id,"attendance_saved","class",classId,JSON.stringify({attendanceDate,pupilCount:validated.length})));
 await env.DB.batch(statements);
 const counts=validated.reduce<Record<AttendanceStatus,number>>((result,entry)=>{result[entry.status]+=1;return result},{present:0,late:0,absent:0,authorised:0});
 return Response.json({ok:true,saved:validated.length,counts});
}

async function accessibleClass(classId:string,userId:string,role:"admin"|"teacher"|"finance"|"parent"){
 return env.DB.prepare(`SELECT c.id,c.name,c.programme,c.room,c.day_of_week AS dayOfWeek,c.start_time AS startTime,c.end_time AS endTime,c.capacity,c.active,u.full_name AS teacherName FROM classes c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.id=? AND c.active=1 AND (?='admin' OR c.teacher_id=?)`).bind(classId,role,userId).first();
}
function roster(classId:string,attendanceDate:string){return env.DB.prepare(`SELECT s.id AS studentId,s.admission_number AS admissionNumber,s.full_name AS fullName,a.id AS attendanceId,a.status,a.check_in_time AS checkInTime,a.notes,a.updated_at AS updatedAt FROM enrolments e JOIN students s ON s.id=e.student_id LEFT JOIN attendance a ON a.student_id=s.id AND a.class_id=e.class_id AND a.attendance_date=? WHERE e.class_id=? AND e.status='active' AND s.status='active' AND date(e.start_date)<=date(?) AND (e.end_date IS NULL OR date(e.end_date)>=date(?)) ORDER BY s.full_name,s.admission_number`).bind(attendanceDate,classId,attendanceDate,attendanceDate).all()}
function clean(value:unknown,maximum:number){return typeof value==="string"?value.trim().slice(0,maximum):""}
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(`${value}T00:00:00Z`);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
function today(){return new Date().toISOString().slice(0,10)}
