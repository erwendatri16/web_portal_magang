// =============================================
// EDGE FUNCTION: notify-new-application
// Kirim notifikasi Email (Resend) + WhatsApp (Fonnte)
// saat ada pengajuan magang baru masuk
// =============================================
// Deploy: supabase functions deploy notify-new-application
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Body bisa dari Database Webhook (ada field "record")
    // atau dari pemanggilan langsung di supabase.js (langsung datanya)
    const data = body.record ?? body;

    const {
      nomor_pengajuan,
      nama_lengkap,
      email,
      no_hp,
      asal_kampus,
      jurusan,
      periode_mulai,
      periode_selesai,
    } = data;

    const results: { email?: string; whatsapp?: string } = {};

    // =========================================
    // 1. KIRIM EMAIL via Resend
    // =========================================
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL");

    if (RESEND_API_KEY && ADMIN_EMAIL) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Web Portal Magang <noreply@resend.dev>", // ganti dengan domain sendiri jika sudah verifikasi
          to: [ADMIN_EMAIL],
          subject: `📋 Pengajuan Magang Baru — ${nama_lengkap} (${nomor_pengajuan})`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fb; }
                .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #003087, #0057d9); color: white; padding: 28px 32px; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
                .body { padding: 28px 32px; }
                .badge { display: inline-block; background: #fff3cd; color: #856404; border: 1px solid #ffc107; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
                td:first-child { font-weight: bold; color: #444; width: 40%; }
                td:last-child { color: #222; }
                tr:nth-child(odd) { background: #f8f9fc; }
                .cta { display: block; margin: 28px auto 0; text-align: center; }
                .cta a { background: #0057d9; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; }
                .footer { background: #f8f9fc; padding: 16px 32px; text-align: center; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 Pengajuan Magang Baru</h1>
                  <p>Diskominfotik Kota Banjarmasin — Web Portal Magang</p>
                </div>
                <div class="body">
                  <span class="badge">⏳ Status: PENDING</span>
                  <table>
                    <tr><td>No. Pengajuan</td><td><b>${nomor_pengajuan}</b></td></tr>
                    <tr><td>Nama Lengkap</td><td>${nama_lengkap}</td></tr>
                    <tr><td>Email</td><td>${email}</td></tr>
                    <tr><td>No. HP</td><td>${no_hp}</td></tr>
                    <tr><td>Asal Kampus</td><td>${asal_kampus}</td></tr>
                    <tr><td>Jurusan</td><td>${jurusan}</td></tr>
                    <tr><td>Periode Mulai</td><td>${periode_mulai}</td></tr>
                    <tr><td>Periode Selesai</td><td>${periode_selesai}</td></tr>
                  </table>
                  <div class="cta">
                    <a href="https://ndtatoyctayebjszwvpz.supabase.co" target="_blank">
                      Buka Admin Panel DIGILOK →
                    </a>
                  </div>
                </div>
                <div class="footer">
                  Email otomatis dari Web Portal Magang Diskominfotik Banjarmasin.<br>
                  Jangan balas email ini.
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      const emailData = await emailRes.json();
      results.email = emailRes.ok ? "OK" : `GAGAL: ${JSON.stringify(emailData)}`;
      console.log("EMAIL RESULT:", results.email, emailData);
    } else {
      results.email = "SKIP (env RESEND_API_KEY / ADMIN_EMAIL tidak diset)";
    }

    // =========================================
    // 2. KIRIM WHATSAPP via Fonnte
    // =========================================
    const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");
    const ADMIN_WA       = Deno.env.get("ADMIN_WA"); // format: 628xxxxxxxxxx

    if (FONNTE_API_KEY && ADMIN_WA) {
      const waMessage =
        `📋 *PENGAJUAN MAGANG BARU*\n` +
        `Diskominfotik Kota Banjarmasin\n\n` +
        `🔢 No. Pengajuan: *${nomor_pengajuan}*\n` +
        `👤 Nama: ${nama_lengkap}\n` +
        `📧 Email: ${email}\n` +
        `📱 No. HP: ${no_hp}\n` +
        `🏫 Kampus: ${asal_kampus}\n` +
        `📚 Jurusan: ${jurusan}\n` +
        `📅 Periode: ${periode_mulai} s/d ${periode_selesai}\n\n` +
        `_Silakan buka Admin Panel DIGILOK untuk menindaklanjuti pengajuan ini._`;

      const formData = new FormData();
      formData.append("target", ADMIN_WA);
      formData.append("message", waMessage);
      formData.append("countryCode", "62");

      const waRes = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": FONNTE_API_KEY,
        },
        body: formData,
      });

      const waData = await waRes.json();
      results.whatsapp = waRes.ok ? "OK" : `GAGAL: ${JSON.stringify(waData)}`;
      console.log("WA RESULT:", results.whatsapp, waData);
    } else {
      results.whatsapp = "SKIP (env FONNTE_API_KEY / ADMIN_WA tidak diset)";
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("EDGE FUNCTION ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});