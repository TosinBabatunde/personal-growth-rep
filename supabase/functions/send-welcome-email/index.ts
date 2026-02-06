import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "https://esm.sh/resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { record } = await req.json();

  if (!record?.email || record.welcome_email_sent) {
    return new Response("Skipped", { status: 200 });
  }

  await resend.emails.send({
    from: "Growth <onboarding@resend.dev>",
    to: record.email,
    subject: "Welcome to Growth",
    html: `
      <p>Hi ${record.full_name || "there"},</p>
      <p>
        Welcome to Growth. You’ve taken a brave step toward deeper self-awareness,
        and we’re honored to walk this journey with you.
      </p>
      <p>
        When you’re ready, invite people you trust and begin your first feedback cycle.
      </p>
      <p>— The Growth Team</p>
    `,
  });

  await supabase
    .from("users")
    .update({ welcome_email_sent: true })
    .eq("id", record.id);

  return new Response("OK", { status: 200 });
});
