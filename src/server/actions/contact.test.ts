import { describe, it, expect, vi } from "vitest";
import { processContactInquiry } from "./contact";

describe("Contact Inquiry Server Action (processContactInquiry)", () => {
  const validPayload = {
    name: "Tanvir Ahmed",
    email: "tanvir.ahmed@example.com",
    phone: "+880 1711 000000",
    category: "registration",
    message: "I would like to inquire about the upcoming batch dates for MTO Readiness.",
  };

  it("validates required fields successfully and dispatches email when sender is mocked", async () => {
    const mockSendEmail = vi.fn().mockResolvedValue({ id: "msg_123" });

    const result = await processContactInquiry(validPayload, {
      clientId: "test-client-1",
      sendEmail: mockSendEmail,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("sent successfully");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        reply_to: "tanvir.ahmed@example.com",
        subject: expect.stringContaining("REGISTRATION"),
      })
    );
  });

  it("fails validation when required fields are missing", async () => {
    const result = await processContactInquiry({}, { clientId: "test-client-2" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.fieldErrors?.category).toBeDefined();
    expect(result.fieldErrors?.message).toBeDefined();
  });

  it("fails validation for invalid email", async () => {
    const result = await processContactInquiry(
      { ...validPayload, email: "not-an-email" },
      { clientId: "test-client-3" }
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.email).toBe("Please provide a valid email address");
  });

  it("rejects message containing HTML tags or script elements", async () => {
    const result = await processContactInquiry(
      { ...validPayload, message: "Hello <script>alert('xss')</script> there" },
      { clientId: "test-client-4" }
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.message).toContain("HTML tags or script elements are not permitted");
  });

  it("silently drops bot submissions when honeypot field is filled", async () => {
    const mockSendEmail = vi.fn().mockResolvedValue({ id: "msg_123" });

    const result = await processContactInquiry(
      { ...validPayload, website_hp: "https://spam-bot.com" },
      { clientId: "bot-client", sendEmail: mockSendEmail }
    );

    expect(result.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("enforces rate limiting when too many submissions are made rapidly", async () => {
    const mockSendEmail = vi.fn().mockResolvedValue({ id: "msg_123" });
    const client = "rate-limit-client";

    // 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const res = await processContactInquiry(validPayload, {
        clientId: client,
        sendEmail: mockSendEmail,
      });
      expect(res.success).toBe(true);
    }

    // 6th request fails rate limit
    const blockedRes = await processContactInquiry(validPayload, {
      clientId: client,
      sendEmail: mockSendEmail,
    });
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain("Too many submission attempts");
  });

  it("reports integration blocker when live Resend API key is not configured and no mock is passed", async () => {
    const result = await processContactInquiry(validPayload, {
      clientId: "unconfigured-client",
    });

    // In local dev/test with no live Resend key configured, it informs cleanly rather than pretending sent
    expect(result.success).toBe(false);
    expect(result.error).toContain("automated contact email service is currently not configured");
  });
});
