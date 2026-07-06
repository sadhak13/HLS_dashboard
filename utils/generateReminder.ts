export function generateWhatsAppReminder(
  parentName: string,
  playerName: string,
  month: string,
  amount: number
): string {
  const message = `Hello ${parentName},\n\nThis is a friendly reminder from the Football Academy that the fee of ₹${amount} for ${playerName} for the month of ${month} is pending.\n\nPlease arrange for the payment at your earliest convenience.\n\nThank you!`;
  
  // Return a URL-encoded string ready for wa.me link
  return encodeURIComponent(message);
}
