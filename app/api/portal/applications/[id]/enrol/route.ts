import { env } from "cloudflare:workers";
import { audit, requireUser, sameOrigin } from "@/lib/auth";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const {id}=await params;const body=await request.json().catch(()=>({})) as {classId?:string;relationship?:string};
 if(!body.classId)return Response.json({error:"Select a class for this child."},{status:400});
 type ApplicationRow={guardian_email:string;guardian_name:string;guardian_phone:string;address:string;child_name:string;date_of_birth:string;gender:string;status:string};
 const application=await env.DB.prepare(`SELECT guardian_email,guardian_name,guardian_phone,address,child_name,date_of_birth,gender,status FROM applications WHERE id=?`).bind(id).first<ApplicationRow>();
 if(!application)return Response.json({error:"Application not found."},{status:404});
 if(application.status==='enrolled')return Response.json({error:"This application has already been enrolled."},{status:409});
 const classRow=await env.DB.prepare(`SELECT c.id,c.name,c.capacity,(SELECT COUNT(*) FROM enrolments e WHERE e.class_id=c.id AND e.status='active') AS enrolled FROM classes c WHERE c.id=? AND c.active=1`).bind(body.classId).first<{id:string;name:string;capacity:number;enrolled:number}>();
 if(!classRow)return Response.json({error:"The selected class is unavailable."},{status:404});
 if(Number(classRow.enrolled)>=Number(classRow.capacity))return Response.json({error:"The selected class is already full."},{status:409});
 const guardian=await env.DB.prepare(`SELECT id FROM guardians WHERE lower(email)=? ORDER BY created_at LIMIT 1`).bind(String(application.guardian_email).toLowerCase()).first<{id:string}>();
 const guardianId=guardian?.id||crypto.randomUUID(),studentId=crypto.randomUUID(),enrolmentId=crypto.randomUUID();
 const admissionNumber=`AHM-${new Date().getUTCFullYear()}-${studentId.replaceAll('-','').slice(0,6).toUpperCase()}`;
 const statements=[];
 if(!guardian)statements.push(env.DB.prepare(`INSERT INTO guardians(id,full_name,email,phone,address) VALUES(?,?,?,?,?)`).bind(guardianId,application.guardian_name,application.guardian_email,application.guardian_phone,application.address));
 statements.push(
  env.DB.prepare(`INSERT INTO students(id,admission_number,full_name,date_of_birth,gender,status) VALUES(?,?,?,?,?,'active')`).bind(studentId,admissionNumber,application.child_name,application.date_of_birth,application.gender),
  env.DB.prepare(`INSERT INTO student_guardians(student_id,guardian_id,relationship,is_primary,collection_authorised) VALUES(?,?,?,1,1)`).bind(studentId,guardianId,(body.relationship||'Parent').trim().slice(0,80)),
  env.DB.prepare(`INSERT INTO enrolments(id,student_id,class_id,start_date,status) VALUES(?,?,?,?, 'active')`).bind(enrolmentId,studentId,body.classId,new Date().toISOString().slice(0,10)),
  env.DB.prepare(`UPDATE applications SET status='enrolled',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id)
 );
 await env.DB.batch(statements);await audit(auth.user.id,"application_enrolled","student",studentId,JSON.stringify({applicationId:id,classId:body.classId,admissionNumber}));
 return Response.json({ok:true,studentId,guardianId,enrolmentId,admissionNumber,className:classRow.name},{status:201});
}
