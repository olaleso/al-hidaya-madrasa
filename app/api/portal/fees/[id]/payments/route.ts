import { env } from "cloudflare:workers";
import { requireUser,sameOrigin } from "@/lib/auth";
const methods=new Set(["cash","card","bank_transfer","online","other"]);

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return Response.json({error:"Invalid request."},{status:403});
 const auth=await requireUser(request,["admin","finance"]);if("response" in auth)return auth.response;
 const {id:feeAccountId}=await params;const body=await request.json().catch(()=>({})) as {amount?:unknown;paidAt?:unknown;method?:unknown;reference?:unknown};
 const amountPence=toPence(body.amount),paidAt=clean(body.paidAt,10),method=clean(body.method,30),reference=clean(body.reference,100);
 if(amountPence===null||amountPence<1)return Response.json({error:"Enter a valid payment amount."},{status:400});
 if(!validDate(paidAt)||paidAt>today())return Response.json({error:"Enter a valid payment date that is not in the future."},{status:400});
 if(!methods.has(method))return Response.json({error:"Select a valid payment method."},{status:400});
 const account=await env.DB.prepare(`SELECT id,amount_due_pence AS amountDuePence,amount_paid_pence AS amountPaidPence,status FROM fee_accounts WHERE id=?`).bind(feeAccountId).first<{id:string;amountDuePence:number;amountPaidPence:number;status:string}>();
 if(!account)return Response.json({error:"Fee account not found."},{status:404});
 if(account.status==="waived")return Response.json({error:"Payments cannot be added to a waived fee account."},{status:409});
 const outstanding=Number(account.amountDuePence)-Number(account.amountPaidPence);
 if(amountPence>outstanding)return Response.json({error:`The payment exceeds the outstanding balance of £${(outstanding/100).toFixed(2)}.`},{status:400});
 const paymentId=crypto.randomUUID(),newPaid=Number(account.amountPaidPence)+amountPence,status=newPaid>=Number(account.amountDuePence)?"paid":"part_paid";
 try{await env.DB.batch([
  env.DB.prepare(`INSERT INTO payments(id,fee_account_id,amount_pence,paid_at,method,reference,recorded_by) VALUES(?,?,?,?,?,?,?)`).bind(paymentId,feeAccountId,amountPence,paidAt,method,reference||null,auth.user.id),
  env.DB.prepare(`UPDATE fee_accounts SET amount_paid_pence=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(newPaid,status,feeAccountId),
  env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),auth.user.id,"payment_recorded","payment",paymentId,JSON.stringify({feeAccountId,amountPence,method,reference:reference||null}))
 ])}catch{return Response.json({error:reference?"That payment reference has already been used.":"The payment could not be recorded."},{status:409})}
 return Response.json({ok:true,paymentId,status,amountPaidPence:newPaid,balancePence:Number(account.amountDuePence)-newPaid},{status:201});
}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
function toPence(value:unknown){const text=typeof value==="number"?String(value):clean(value,30);if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const amount=Math.round(Number(text)*100);return Number.isSafeInteger(amount)?amount:null}
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(`${value}T00:00:00Z`);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
function today(){return new Date().toISOString().slice(0,10)}
