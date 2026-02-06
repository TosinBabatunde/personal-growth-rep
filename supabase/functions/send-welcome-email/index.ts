// supabase/functions/send-welcome-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) console.warn("Missing SUPABASE_URL");
if (!SERVICE_ROLE_KEY) console.warn("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!RESEND_API_KEY) console.warn("Missing RESEND_API_KEY");

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const supabase =
  SUPABASE_URL && SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null;

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body?.record;

    // Expecting a DB webhook payload like { type, table, record, old_record }
    if (!record) return new Response("Missing record", { status: 400 });
    if (!record.id) return new Response("Missing record.id", { status: 400 });

    // Only send if we have an email and we haven't already sent
    const email = (record.email || "").trim();
    if (!email) return new Response("Skipped: no email", { status: 200 });

    if (record.welcome_email_sent === true) {
      console.log("Skipped", {
        id: record.id,
        reason: "already sent",
        welcome_email_sent: record.welcome_email_sent,
      });
      return new Response("Skipped: already sent", { status: 200 });
    }
  
    console.log("Webhook record snapshot", {
      id: record.id,
      email: record.email,
      full_name: record.full_name,
      welcome_email_sent: record.welcome_email_sent,
    });

    // If name isn't set yet, skip (prevents sending too early on initial upsert)
    const fullName = (record.full_name || "").trim();
    if (!fullName) return new Response("Skipped: no full_name yet", { status: 200 });

    if (!resend) return new Response("Missing RESEND_API_KEY", { status: 500 });
    if (!supabase) return new Response("Missing Supabase env vars", { status: 500 });

    // Send email
    const sendResult = await resend.emails.send({
      from: "Growth <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Growth",
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
          <p>Hi ${escapeHtml(fullName)},</p>
          <p>
            Welcome to Growth. You’ve taken a brave step toward deeper self-awareness, and I’m grateful you’re here.
          </p>
          <p>
            When you’re ready, start a feedback cycle and invite a few people you trust. Honest, kind feedback becomes a mirror
            that helps you grow.
          </p>
          <p style="margin-top: 18px;">With care,<br/>The Growth Team</p>
        </div>
      `,
    });

    if ((sendResult as any)?.error) {
      console.error("Resend failed:", (sendResult as any).error);
      return new Response("Resend failed", { status: 500 });
    }
    
    console.log("Resend send result", sendResult);

    // Mark as sent (idempotency)
    const { error } = await supabase
      .from("users")
      .update({ welcome_email_sent: true })
      .eq("id", record.id);

    if (error) {
      console.error("Failed to mark welcome_email_sent:", error);
      // Email might have gone out; don't fail hard.
      return new Response("Sent email, but failed to update flag", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
