export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const {
      orderNumber,
      customerName,
      phone,
      cityId,
      cityEnglish,
      cityArabic,
      address,
      note,
      selectedColors,
      totalQuantity,
      totalPrice,
      shipping
    } = req.body || {};

    // Basic validation
    if (
      !customerName ||
      !phone ||
      !cityId &&
      !cityEnglish &&
      !cityArabic ||
      !address ||
      !totalQuantity ||
      !totalPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "بيانات الطلب غير مكتملة"
      });
    }

    // Telegram secrets
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("Telegram environment variables are missing.");

      return res.status(500).json({
        success: false,
        message: "Telegram is not configured"
      });
    }

    // Format selected colors
    let colorsText = "لا توجد ألوان";

    if (Array.isArray(selectedColors) && selectedColors.length > 0) {
      colorsText = selectedColors
        .map((item) => {
          const color =
            item.color ??
            item.id ??
            item.number ??
            item.name ??
            "غير معروف";

          const quantity =
            item.quantity ??
            item.qty ??
            1;

          return `اللون ${String(color).padStart(2, "0")} × ${quantity}`;
        })
        .join("\n");
    }

    const message = `
🛍️ <b>طلب جديد — Ayashawl</b>

━━━━━━━━━━━━━━

🔢 <b>رقم الطلب:</b>
${escapeHtml(orderNumber || "غير محدد")}

👤 <b>الاسم:</b>
${escapeHtml(customerName)}

📱 <b>الهاتف:</b>
${escapeHtml(phone)}

📍 <b>المدينة:</b>
${escapeHtml(cityEnglish || "")} — ${escapeHtml(cityArabic || "")}

🆔 <b>City ID:</b>
${escapeHtml(String(cityId ?? ""))}

🏠 <b>العنوان:</b>
${escapeHtml(address)}

📝 <b>الملاحظة:</b>
${escapeHtml(note || "لا توجد")}

━━━━━━━━━━━━━━

🧣 <b>الألوان والكميات:</b>

${escapeHtml(colorsText)}

━━━━━━━━━━━━━━

📦 <b>عدد الشالات:</b>
${escapeHtml(String(totalQuantity))}

💰 <b>السعر:</b>
${escapeHtml(String(totalPrice))} DH

🚚 <b>التوصيل:</b>
${Number(shipping || 0) === 0 ? "مجاني" : `${shipping} DH`}

💵 <b>الإجمالي:</b>
${escapeHtml(String(totalPrice))} DH

━━━━━━━━━━━━━━

🤍 <b>Ayashawl</b>
`;

    const telegramUrl =
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML"
      })
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error("Telegram API error:", telegramData);

      return res.status(502).json({
        success: false,
        message: "تعذر إرسال الطلب إلى Telegram"
      });
    }

    return res.status(200).json({
      success: true,
      message: "تم إرسال الطلب بنجاح",
      orderNumber
    });

  } catch (error) {
    console.error("Order API error:", error);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء معالجة الطلب"
    });
  }
}


// Escape HTML characters before sending to Telegram.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
