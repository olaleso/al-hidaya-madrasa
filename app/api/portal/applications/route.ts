import { env } from "cloudflare:workers";
import { requireUser } from "@/lib/auth";
export async function GET(request:Request){
 const auth=await requireUser(request,["admin"]);if("response" in auth)return auth.response;
 const rows=await env.DB.prepare(`SELECT id,child_name AS childName,date_of_birth AS dateOfBirth,gender,programme,guardian_name AS guardianName,guardian_email AS guardianEmail,guardian_phone AS guardianPhone,address,postcode,notes,status,created_at AS createdAt FROM applications ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'offered' THEN 2 WHEN 'waitlisted' THEN 3 ELSE 4 END, created_at DESC`).all();
 return Response.json({applications:rows.results});
}
