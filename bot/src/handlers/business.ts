/**
 * Business / Secretary-Mode message handler.
 *
 * Wraps handleMessage (unchanged) with call-scheduling logic that is
 * ONLY active when a message arrives via the Telegram Business API
 * (business_connection_id present). The regular bot path never touches this file.
 */
import { Telegraf } from "telegraf";
import { handleMessage } from "./message.js";
import {
  findAvailableSlots,
  getPendingOffer,
  createOffer,
  confirmSlot,
  formatDate,
} from "../scheduling.js";
import { getOrCreateLead } from "../db.js";

// ─── Trigger detection ────────────────────────────────────────────────────────

const CALL_TRIGGERS = /qo['']ng['']iroq|call|gaplash(?:moq|ish)?|telefon|suhbat|uchrash|bog['']lan|murojaat|zvon|zang/i;

/** Detects slot choice from user text. Returns '08:00' | '19:00' | null. */
function parseSlotChoice(text: string): "08:00" | "19:00" | null {
  const t = text.toLowerCase();
  if (/\b8|08:00|ertalab|sakkiz|tonggi|morning\b/.test(t)) return "08:00";
  if (/\b19|7\s*pm|19:00|kechqurun|etti|yetti|evening\b/.test(t)) return "19:00";
  return null;
}

// ─── Reply helper (sends through business account) ───────────────────────────

async function bizReply(bot: Telegraf, chatId: string, bizId: string, text: string) {
  await bot.telegram.sendMessage(chatId, text, {
    business_connection_id: bizId,
  } as any);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function handleBusinessMessage(
  bot: Telegraf,
  chatId: string,
  username: string | null,
  text: string,
  businessConnectionId: string
) {
  // ── Phase 1: check if we're waiting for a slot choice ────────────────────
  const pending = await getPendingOffer(chatId);

  if (pending) {
    const chosen = parseSlotChoice(text);

    if (chosen) {
      // User picked a slot — confirm it
      const { freeSlots, date } = await findAvailableSlots();

      // Re-validate the chosen slot is still free (race condition guard)
      if (!freeSlots.includes(chosen)) {
        const fallback = freeSlots[0] ?? "08:00";
        await bizReply(
          bot, chatId, businessConnectionId,
          `Voy, ${chosen} band bo'lib qolibdi 😅 ${formatDate(date)} soat ${fallback} da qo'ng'iroq qilsak bo'ladimi?`
        );
        return;
      }

      await confirmSlot(chatId, date, chosen);

      const lead = await getOrCreateLead(chatId, username);
      const name = lead.full_name ?? username ?? null;
      const greeting = name ? `${name}, yozib qoldirdik!` : "Yozib qoldirdik!";
      await bizReply(
        bot, chatId, businessConnectionId,
        `${greeting} ${formatDate(date)} soat ${chosen} da qo'ng'iroq qilamiz 📞\nAgar vaqt o'zgarsa — @upnex_admin ga bexijolat yozing.`
      );

      console.log(`[business] call booked: ${chatId} → ${date} ${chosen}`);
      return; // Don't run AI for this message — it's just a slot confirmation
    }

    // User replied something else while we were waiting — let AI handle it,
    // but keep the pending offer alive (don't cancel it)
  }

  // ── Phase 2: run the normal AI + CRM pipeline ────────────────────────────
  await handleMessage(bot, chatId, username, text, businessConnectionId);

  // ── Phase 3: offer a call if triggered ───────────────────────────────────
  if (CALL_TRIGGERS.test(text)) {
    // Don't double-offer if there's already a pending one
    const stillPending = await getPendingOffer(chatId);
    if (stillPending) return;

    const { date, freeSlots } = await findAvailableSlots();

    const lead = await getOrCreateLead(chatId, username);

    if (freeSlots.length === 0) {
      await bizReply(
        bot, chatId, businessConnectionId,
        `Bugun vaqtlar band ekan, lekin ertaga bo'sh — soat 08:00 yoki 19:00 qulaymi? 📞`
      );
      return;
    }

    // Store the offer (using first free slot as placeholder; confirmSlot will update)
    await createOffer(chatId, lead.full_name, date, freeSlots[0]);

    if (freeSlots.length === 2) {
      await bizReply(
        bot, chatId, businessConnectionId,
        `${formatDate(date)} soat 08:00 yoki 19:00 da qo'ng'iroq qilsak — qaysi biri qulay? 📞`
      );
    } else {
      await bizReply(
        bot, chatId, businessConnectionId,
        `${formatDate(date)} soat ${freeSlots[0]} da qo'ng'iroq qilamiz — ma'qulmi? 📞`
      );
    }

    console.log(`[business] call offer sent: ${chatId} → ${date} ${freeSlots.join("/")}`);
  }
}
