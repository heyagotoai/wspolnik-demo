import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { to, subject, body, replyTo, attachment_base64, attachment_filename } = await req.json()

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const smtpHost = Deno.env.get("SMTP_HOST")
    const smtpUser = Deno.env.get("SMTP_USER")
    const smtpPass = Deno.env.get("SMTP_PASS")

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: 465,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sendOptions: Record<string, any> = {
      from: smtpUser,
      to,
      subject,
      content: body,
      replyTo,
    }

    if (attachment_base64 && attachment_filename) {
      sendOptions.attachments = [
        {
          filename: attachment_filename,
          content: attachment_base64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ]
    }

    await client.send(sendOptions)
    await client.close()

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Email send error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
