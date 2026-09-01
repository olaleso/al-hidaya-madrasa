"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormFeedback({message,tone="error",id}:{message:string;tone?:"error"|"success";id?:string}){
 if(!message)return null;
 const Icon=tone==="success"?CheckCircle2:AlertCircle;
 return <div id={id} className={`shared-feedback ${tone}`} role={tone==="error"?"alert":"status"} aria-live={tone==="error"?"assertive":"polite"}><Icon aria-hidden="true"/><span>{message}</span></div>;
}
