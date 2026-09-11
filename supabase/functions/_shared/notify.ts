/**
 * Optional owner notification for the first photo request of a verified session.
 *
 * Disabled unless both the destination address and delivery credentials are
 * configured. De-duplication happens in the database before this is called.
 */

export interface NotificationInput {
  visitorEmail: string;
  gallery: string;
  photoPath: string;
  occurredAt: string;
}

export const notificationsEnabled = (): boolean =>
  Boolean(Deno.env.get("OWNER_NOTIFICATION_EMAIL") && Deno.env.get("RESEND_API_KEY"));

export const sendOwnerNotification = async (input: NotificationInput): Promise<void> => {
  const to = Deno.env.get("OWNER_NOTIFICATION_EMAIL");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "notifications@dnlvocatio.com";

  if (!to || !apiKey) {
    throw new Error("owner notifications are not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Photo access on dnlvocatio.com",
      text: [
        `A verified visitor requested a protected photo.`,
        ``,
        `Verified email: ${input.visitorEmail}`,
        `Gallery:        ${input.gallery}`,
        `First request:  ${input.photoPath}`,
        `Server time:    ${input.occurredAt}`,
        ``,
        `This records an access request for the file, not that the visitor looked at it.`,
        `One notification is sent per verified session.`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`notification delivery failed: ${response.status} ${detail.slice(0, 200)}`);
  }
};
