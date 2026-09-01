"use client";

import { useMemo, useState } from "react";
import { Bell, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Search, Settings, ShieldCheck, Users, WalletCards, X } from "lucide-react";
import type { PortalUser } from "./auth-gate";
import { LiveRecords, OverviewView } from "./live-records";

const nav = [["Overview", LayoutDashboard], ["Applications", FileText], ["Students", GraduationCap], ["Classes", BookOpen], ["Attendance", ClipboardCheck], ["Fees", WalletCards], ["Announcements", MessageSquare], ["Staff", Users], ["Safeguarding", ShieldCheck], ["Reports", CalendarDays]] as const;
const roleNavigation:Record<PortalUser["role"],readonly string[]>={admin:["Overview","Applications","Students","Classes","Attendance","Fees","Announcements","Staff","Safeguarding","Reports"],teacher:["Overview","Students","Classes","Attendance","Announcements","Safeguarding","Reports"],finance:["Overview","Students","Fees","Announcements","Reports"],parent:["Overview","Students","Attendance","Fees","Announcements"]};
export default function Home({user,onLogout}:{user:PortalUser;onLogout:()=>Promise<void>}) {
  const [active, setActive] = useState("Overview");
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const date = useMemo(() => new Intl.DateTimeFormat("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(new Date()), []);
  return <div className="app-shell">
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <div className="brand"><img src="/al-hidaya-logo.png" alt="Al-Hidaya Islamic Centre" /></div>
      <button className="close-menu" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20}/></button>
      <nav>{nav.filter(([label])=>roleNavigation[user.role].includes(label)).map(([label, Icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => {setActive(label); setMenu(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className={active==="Settings"?"active":""} onClick={()=>{setActive("Settings");setMenu(false)}}><Settings size={18}/>Settings</button><button onClick={onLogout}>Sign out</button><div className="profile"><div className="avatar">{user.fullName.split(/\s+/).map(n=>n[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{user.fullName}</strong><span>{user.role.charAt(0).toUpperCase()+user.role.slice(1)}</span></div><MoreHorizontal size={18}/></div></div>
    </aside>
    {menu && <button className="scrim" onClick={() => setMenu(false)} aria-label="Close navigation"/>}
    <main>
      <header><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open menu"><Menu/></button><div className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search students, guardians, classes…"/></div><button className="icon-button" aria-label="Notifications"><Bell size={20}/><i/></button><button className="help">Help & support</button></header>
      <div className="content">
        <section className="welcome"><div><p>{date}</p><h1>{active === "Overview" ? `Assalamu alaikum, ${user.fullName.split(" ")[0]}` : active}</h1><span>{active === "Overview" ? "Here’s what is happening across Al-Hidaya Madrasat today." : `Manage Al-Hidaya Madrasat ${active.toLowerCase()} from one secure place.`}</span></div>{user.role==="admin"&&<button className="primary" onClick={() => setActive("Applications")}><FileText size={18}/>Review applications</button>}</section>
        {active === "Overview" ? <OverviewView user={user} onNavigate={setActive}/> : <LiveRecords section={active} user={user} query={query} onLogout={onLogout}/>} 
      </div>
      <footer><span>Al-Hidaya Islamic Centre · 66 Chorley Street, Bolton BL1 4AL</span><span>Designed and delivered by <strong>NuraSpecs</strong></span></footer>
    </main>
  </div>;
}
