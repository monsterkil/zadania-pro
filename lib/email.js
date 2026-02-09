const EMAILLABS_API = "https://api.emaillabs.net.pl/api";

async function sendEmail({ to, subject, html, text }) {
  const appKey = process.env.EMAILLABS_APP_KEY;
  const secretKey = process.env.EMAILLABS_SECRET_KEY;
  const smtpAccount = process.env.EMAILLABS_SMTP_ACCOUNT;
  const fromEmail = process.env.EMAIL_FROM || "zadania@biostima.pl";
  const fromName = process.env.EMAIL_FROM_NAME || "Zadania Pro";

  if (!appKey || !secretKey) {
    console.log("[EmailLabs] Brak kluczy API — email pominięty:", subject);
    return { success: false, reason: "no_api_keys" };
  }

  const auth = Buffer.from(`${appKey}:${secretKey}`).toString("base64");

  // EmailLabs expects recipients as an object: { "email": { "name": "..." } }
  const recipients = Array.isArray(to) ? to : [to];
  const toObj = {};
  recipients.forEach((email) => {
    toObj[email] = { message_id: `zp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  });

  const payload = {
    from: fromEmail,
    from_name: fromName,
    to: toObj,
    subject,
    html: html || "",
    text: text || subject,
  };
  if (smtpAccount && String(smtpAccount).trim()) {
    payload.smtp_account = String(smtpAccount).trim();
  }

  if (!smtpAccount || !String(smtpAccount).trim()) {
    console.warn("[EmailLabs] Brak EMAILLABS_SMTP_ACCOUNT — ustaw w env (np. 1.biostima.smtp), inaczej maile mogą nie dochodzić");
  }

  try {
    const res = await fetch(`${EMAILLABS_API}/new_sendmail`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { _raw: await res.text() };
    }

    if (res.ok) {
      const ok = data && data.success !== false && !data.error;
      if (ok) {
        console.log("[EmailLabs] Wysłano:", subject, "→", recipients.join(", "));
      } else {
        console.error("[EmailLabs] API 200 ale błąd w odpowiedzi:", data);
      }
      return { success: !!ok, data };
    } else {
      console.error("[EmailLabs] Błąd HTTP", res.status, data);
      return { success: false, data };
    }
  } catch (err) {
    console.error("[EmailLabs] Exception:", err.message);
    return { success: false, error: err.message };
  }
}

function emailTemplate({ title, status, description, quoteAmount, deadline, taskUrl }) {
  const statusLabels = {
    new: { label: "Nowe zadanie", color: "#f59e0b", bg: "#fef3c7" },
    in_progress: { label: "W realizacji", color: "#3b82f6", bg: "#dbeafe" },
    done: { label: "Ukończone", color: "#10b981", bg: "#d1fae5" },
  };

  const s = statusLabels[status] || statusLabels.new;
  const descPreview = description ? description.substring(0, 300) + (description.length > 300 ? "..." : "") : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      
      <div style="padding:24px 28px;border-bottom:1px solid #e2e8f0;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;">Zadania <span style="color:#3b82f6;">Pro</span></div>
      </div>

      <div style="padding:28px;">
        <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${s.bg};color:${s.color};font-size:13px;font-weight:600;margin-bottom:16px;">
          ${s.label}
        </div>

        <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h2>
        
        ${descPreview ? `<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">${descPreview}</p>` : ""}
        
        ${quoteAmount ? `<div style="padding:12px 16px;background:#f8fafc;border-radius:8px;margin-bottom:16px;">
          <span style="font-size:13px;color:#64748b;">Wycena:</span>
          <span style="font-size:18px;font-weight:700;color:#0f172a;margin-left:8px;">${Number(quoteAmount).toLocaleString("pl-PL")} PLN</span>
        </div>` : ""}
        
        ${deadline ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;">📅 Termin: <strong>${new Date(deadline).toLocaleDateString("pl-PL")}</strong></p>` : ""}

        ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;padding:10px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Zobacz zadanie</a>` : ""}
      </div>

      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="font-size:12px;color:#94a3b8;margin:0;">Wiadomość automatyczna z systemu Zadania Pro</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Notification functions

async function notifyNewTask(task) {
  const recipients = (process.env.EMAIL_NEW_TASK_TO || "damian@biostima.pl,sklep@biostima.pl").split(",").map((e) => e.trim());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return sendEmail({
    to: recipients,
    subject: `🆕 Nowe zadanie: ${task.title}`,
    html: emailTemplate({
      title: task.title,
      status: "new",
      description: task.description,
      quoteAmount: task.quoteAmount,
      taskUrl: `${appUrl}/task/${task.id}`,
    }),
  });
}

async function notifyInProgress(task) {
  const recipient = process.env.EMAIL_STATUS_CHANGE_TO || "biuro@biostima.pl";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return sendEmail({
    to: [recipient],
    subject: `🔄 W realizacji: ${task.title}`,
    html: emailTemplate({
      title: task.title,
      status: "in_progress",
      description: task.description,
      quoteAmount: task.quoteAmount,
      deadline: task.deadline,
      taskUrl: `${appUrl}/task/${task.id}`,
    }),
  });
}

async function notifyDone(task) {
  const recipient = process.env.EMAIL_STATUS_CHANGE_TO || "biuro@biostima.pl";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return sendEmail({
    to: [recipient],
    subject: `✅ Ukończone: ${task.title}`,
    html: emailTemplate({
      title: task.title,
      status: "done",
      description: task.description,
      quoteAmount: task.quoteAmount,
      deadline: task.deadline,
      taskUrl: `${appUrl}/task/${task.id}`,
    }),
  });
}

module.exports = {
  sendEmail,
  notifyNewTask,
  notifyInProgress,
  notifyDone,
};
