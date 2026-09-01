export async function portalApi<T>(url:string,init?:RequestInit):Promise<T>{
 const response=await fetch(url,{credentials:"same-origin",...init,headers:{"Content-Type":"application/json",...(init?.headers||{})}});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"The request could not be completed.");return data;
}
export function money(pence:number){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(pence||0)/100)}
export function displayDate(value:string){if(!value)return "—";return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value.slice(0,10)}T12:00:00`))}
export function localToday(){const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60_000).toISOString().slice(0,10)}
