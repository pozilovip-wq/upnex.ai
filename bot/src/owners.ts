export const OWNERS: Record<string, string> = {
  "7456490129": "pozilovip",
  "1479721056": "nurislom221",
};

export function isOwner(chatId: string): boolean {
  return chatId in OWNERS;
}

export function ownerName(chatId: string): string {
  return OWNERS[chatId] ?? "unknown";
}
