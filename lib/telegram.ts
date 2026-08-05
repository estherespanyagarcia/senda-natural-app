const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendTelegramMessage(
  message: string,
  keyboard?: InlineKeyboardButton[][]
): Promise<string | null> {
  const body: Record<string, unknown> = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
  };

  if (keyboard) {
    body.reply_markup = { inline_keyboard: keyboard };
  }

  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Telegram sendMessage failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.result?.message_id?.toString() ?? null;
}

export async function editTelegramMessage(
  messageId: string,
  text: string,
  keyboard?: InlineKeyboardButton[][]
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: TELEGRAM_CHAT_ID,
    message_id: parseInt(messageId),
    text,
    parse_mode: "HTML",
  };

  if (keyboard) {
    body.reply_markup = { inline_keyboard: keyboard };
  }

  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}
