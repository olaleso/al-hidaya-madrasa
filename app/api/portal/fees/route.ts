import { env } from "cloudflare:workers";
import { audit,requireUser,sameOrigin } from "@/lib/auth";

export async function GET(request:Request){
 const auth=await requireUser(request,["admin","finance","parent"]);if("response" in auth)return auth.response;
 const parent=auth.user.role==="parent"?1:0;
 const accounts=await env.DB.prepare(`SELECT f.id,f.student_id AS studentId,s.admission_number AS admissionNumber,s.full_name AS studentName,f.term,f.amount_due_pence AS amountDuePence,f.amount_paid_pence AS amountPaidPence,(f.amount_due_pence-f.amount_paid_pence) AS balancePence,f.due_date AS dueDate,f.status,f.created_at AS createdAt,g.full_name AS guardianName,g.email AS guardianEmail FROM fee_accounts f JOIN students s ON s.id=f.student_id LEFT JOIN student_guardians sg ON sg.student_id=s.id AND sg.is_primary=1 LEFT JOIN guardians g ON g.id=sg.guardian_id WHERE (?=0 OR g.user_id=?) ORDER BY CASE f.status WHEN 'unpaid' THEN 0 WHEN 'part_paid' THEN 1 ELSE 2 END,f.due_date,s.full_name`).bind(parent,auth.user.id).all();
 const payments=await env.DB.prepare(`SELECT p.id,p.fee_account_id AS feeAccountId,p.amount_pence AS amountPence,p.paid_at AS paidAt,p.method,p.reference,u.full_name AS recordedBy FROM payments p JOIN fee_accounts f ON f.id=p.fee_account_id JOIN students s ON s.id=f.student_id LEFT JOIN student_guardians sg ON sg.student_id=s.id AND sg.is_primary=1 LEFT JOIN guardians g ON g.id=sg.guardian_id LEFT JOIN users u ON u.id=p.recorded_by WHERE (?=0 OR g.user_id=?) ORDER BY p.paid_at DESC,p.created_at DESC`).bind(parent,auth.user.id).all();
 const summary=accounts.results.reduce((result,row)=>{const item=row as Record<string,unknown>;result.due+=Number(item.amountDuePence||0);result.paid+=Number(item.amountPaidPence||0);result.balance+=Number(item.balancePence||0);if(item.status!=="paid"&&item.status!=="waived"&&item.dueDate&&String(item.dueDate)<today())result.overdue+=1;return result},{due:0,paid:0,balance:0,overdue:0});
 return Response.json({accounts:accounts.results,payments:payments.results,summary});
}

export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin","finance"]);if("response" in auth)return auth.response;
 const body=await request.json().catch(()=>({})) as {studentId?:unknown;term?:unknown;amount?:unknown;dueDate?:unknown};
 const studentId=clean(body.studentId,100),term=clean(body.term,100),dueDate=clean(body.dueDate,10),amountDuePence=toPence(body.amount);
 if(!studentId||!term||amountDuePence===null||amountDuePence<1)return Response.json({error:"Select a pupil and enter a valid term and amount."},{status:400});
 if(dueDate&&!validDate(dueDate))return Response.json({error:"Enter a valid fee due date."},{status:400});
 const student=await env.DB.prepare(`SELECT id,full_name AS fullName FROM students WHERE id=? AND status='active'`).bind(studentId).first<{id:string;fullName:string}>();
 if(!student)return Response.json({error:"The selected active pupil was not found."},{status:404});
 const id=crypto.randomUUID();
 try{await env.DB.prepare(`INSERT INTO fee_accounts(id,student_id,term,amount_due_pence,due_date,status) VALUES(?,?,?,?,?,'unpaid')`).bind(id,studentId,term,amountDuePence,dueDate||null).run()}
 catch{return Response.json({error:`A fee account already exists for ${student.fullName} and ${term}.`},{status:409})}
 await audit(auth.user.id,"fee_account_created","fee_account",id,JSON.stringify({studentId,term,amountDuePence}));
 return Response.json({ok:true,id},{status:201});
}

function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
function toPence(value:unknown){const text=typeof value==="number"?String(value):clean(value,30);if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const amount=Math.round(Number(text)*100);return Number.isSafeInteger(amount)?amount:null}
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(`${value}T00:00:00Z`);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
function today(){return new Date().toISOString().slice(0,10)}
