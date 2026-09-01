"use client";
import type { PortalUser } from "./auth-gate";
import { PasswordChange } from "./password-change";
export function SettingsView({user,onLogout}:{user:PortalUser;onLogout:()=>Promise<void>}){return <section className="panel live-records operations-module"><div className="records-toolbar"><div><h3>Account settings</h3><p>Manage the security of your own portal account.</p></div></div><PasswordChange user={user} onChanged={onLogout}/></section>}
