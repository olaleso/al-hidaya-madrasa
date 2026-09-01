import { env } from "cloudflare:workers";

type EmailStatus = "sent" | "not_configured" | "failed";

export async function POST(request: Request) {
  try {
    const data = await request.json() as Record<string, unknown>;
    const childName = clean(data.childName);
    const dateOfBirth = clean(data.dateOfBirth);
    const gender = clean(data.gender).toLowerCase();
    const programme = clean(data.programme);
    const guardianName = clean(data.guardianName);
    const email = clean(data.email).toLowerCase();
    const phone = clean(data.phone);
    const address = clean(data.address);
    const postcode = clean(data.postcode).toUpperCase();
    const notes = clean(data.notes);

    if (!childName || !dateOfBirth || !gender || !programme || !guardianName || !email || !phone || !address || !postcode) {
      return Response.json({ error: "Please complete all required fields." }, { status: 400 });
    }
    if (gender !== "male" && gender !== "female") {
      return Response.json({ error: "Please select the child's gender." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const reference = `AHM-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;

    await env.DB.prepare(`INSERT INTO applications (id, child_name, date_of_birth, gender, programme, guardian_name, guardian_email, guardian_phone, address, postcode, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`)
      .bind(id, childName, dateOfBirth, gender, programme, guardianName, email, phone, address, postcode, notes || null)
      .run();

    const emailStatus = await sendConfirmationEmail({ to: email, guardianName, childName, programme, reference });
    return Response.json({ id, reference, status: "received", emailStatus }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({
      error: message.includes("DB")
        ? "Admissions are being prepared. Please contact the madrasat directly for now."
        : "We could not submit the application. Please try again.",
    }, { status: 500 });
  }
}

async function sendConfirmationEmail(details: { to: string; guardianName: string; childName: string; programme: string; reference: string }): Promise<EmailStatus> {
  const runtimeEnv = env as typeof env & { RESEND_API_KEY?: string; EMAIL_FROM?: string };
  const apiKey = runtimeEnv.RESEND_API_KEY;
  if (!apiKey) return "not_configured";

  const from = runtimeEnv.EMAIL_FROM || "Al-Hidaya Madrasat <admissions@alhidayaislamiccentre.org>";
  const guardianName = escapeHtml(details.guardianName);
  const childName = escapeHtml(details.childName);
  const programme = escapeHtml(details.programme);
  const reference = escapeHtml(details.reference);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [details.to],
        reply_to: "alhidayatulummaha@gmail.com",
        subject: `Al-Hidaya Madrasat application received – ${details.reference}`,
        text: `Assalamu alaikum ${details.guardianName},\n\nJazakAllahu khayran. We have received the application for ${details.childName} for the ${details.programme} programme.\n\nApplication reference: ${details.reference}\n\nPlease keep this reference. The Al-Hidaya Madrasat team will contact you after reviewing the application.\n\nAl-Hidaya Islamic Centre\n66 Chorley Street, Bolton BL1 4AL\n+44 7507 703182`,
        html: `<!doctype html><html><body style="margin:0;background:#f5f1e7;font-family:Arial,sans-serif;color:#18251f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#142c23;padding:28px;text-align:center;color:#fff"><h1 style="margin:0;font-family:Georgia,serif;font-size:28px">Al-Hidaya Madrasat</h1><p style="margin:8px 0 0;color:#e4c66c">Application received</p></td></tr><tr><td style="padding:32px"><p>Assalamu alaikum ${guardianName},</p><p>JazakAllahu khayran. We have received the application for <strong>${childName}</strong> for the <strong>${programme}</strong> programme.</p><div style="margin:26px 0;padding:18px;background:#f8f4e9;border:1px solid #e5dcc4;border-radius:10px;text-align:center"><span style="display:block;font-size:12px;color:#6e746f;text-transform:uppercase;letter-spacing:1px">Application reference</span><strong style="display:block;margin-top:8px;font-size:22px;color:#142c23">${reference}</strong></div><p>Please keep this reference. The madrasat team will contact you after reviewing the application.</p><p style="margin-top:30px">Was-salamu alaikum,<br><strong>Al-Hidaya Madrasat</strong></p></td></tr><tr><td style="padding:20px 32px;background:#f8f4e9;font-size:12px;line-height:1.6;color:#626a65">Al-Hidaya Islamic Centre<br>66 Chorley Street, Bolton BL1 4AL<br>+44 7507 703182</td></tr></table></td></tr></table></body></html>`,
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}
