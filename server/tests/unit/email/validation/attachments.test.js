const {
  validateAttachments,
  validateAttachmentsWithVirusScan,
  setVirusScanHook,
  clearVirusScanHook,
  getVirusScanHook,
} = require("../../../../src/email/validation/attachments");
const AttachmentValidationError = require("../../../../src/email/errors/AttachmentValidationError");

describe("Attachment Validation", () => {
  describe("validateAttachments", () => {
    test("passes for valid attachments", () => {
      const errors = validateAttachments([
        { filename: "doc.pdf", content: Buffer.from("test"), contentType: "application/pdf" },
      ]);
      expect(errors.length).toBe(0);
    });

    test("returns empty for no attachments", () => {
      expect(validateAttachments(null)).toEqual([]);
      expect(validateAttachments([])).toEqual([]);
      expect(validateAttachments(undefined)).toEqual([]);
    });

    test("rejects disallowed MIME types", () => {
      const errors = validateAttachments([
        {
          filename: "virus.exe",
          content: Buffer.from("bad"),
          contentType: "application/x-msdownload",
        },
      ]);
      expect(errors.length).toBe(1);
      expect(errors[0]).toBeInstanceOf(AttachmentValidationError);
      expect(errors[0].message).toContain("disallowed content type");
    });

    test("rejects oversized attachments", () => {
      const errors = validateAttachments(
        [
          {
            filename: "large.pdf",
            content: Buffer.alloc(15 * 1024 * 1024),
            contentType: "application/pdf",
          },
        ],
        { maxSize: 10 * 1024 * 1024 }
      );
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("exceeds maximum size");
    });

    test("rejects attachments with both content and path", () => {
      const errors = validateAttachments([
        {
          filename: "conflict.pdf",
          content: Buffer.from("test"),
          path: "/tmp/test.pdf",
          contentType: "application/pdf",
        },
      ]);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("not both");
    });

    test("infers content type from filename", () => {
      const errors = validateAttachments(
        [{ filename: "doc.pdf", content: Buffer.from("test") }],
        { allowedTypes: ["application/pdf"] }
      );
      expect(errors.length).toBe(0);
    });

    test("rejects missing filename, content, and path", () => {
      const errors = validateAttachments([{}]);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("filename, content, or path is required");
    });
  });

  describe("validateAttachmentsWithVirusScan", () => {
    beforeEach(() => {
      clearVirusScanHook();
    });

    test("passes validation without virus hook", async () => {
      const errors = await validateAttachmentsWithVirusScan([
        { filename: "doc.pdf", content: Buffer.from("test"), contentType: "application/pdf" },
      ]);
      expect(errors.length).toBe(0);
    });

    test("calls virus scan hook", async () => {
      const mockHook = jest.fn().mockResolvedValue({ infected: false });
      setVirusScanHook(mockHook);

      const errors = await validateAttachmentsWithVirusScan([
        { filename: "doc.pdf", content: Buffer.from("test"), contentType: "application/pdf" },
      ]);

      expect(errors.length).toBe(0);
      expect(mockHook).toHaveBeenCalledTimes(1);
    });

    test("rejects infected attachments", async () => {
      const mockHook = jest.fn().mockResolvedValue({
        infected: true,
        message: "Trojan detected",
      });
      setVirusScanHook(mockHook);

      const errors = await validateAttachmentsWithVirusScan([
        { filename: "bad.pdf", content: Buffer.from("virus"), contentType: "application/pdf" },
      ]);

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("failed virus scan");
    });

    test("handles virus scan errors", async () => {
      const mockHook = jest.fn().mockRejectedValue(new Error("Scan service down"));
      setVirusScanHook(mockHook);

      const errors = await validateAttachmentsWithVirusScan([
        { filename: "doc.pdf", content: Buffer.from("test"), contentType: "application/pdf" },
      ]);

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("Virus scan failed");
    });

    test("setVirusScanHook validates input", () => {
      expect(() => setVirusScanHook("not a function")).toThrow();
    });

    test("getVirusScanHook returns current hook", () => {
      const hook = jest.fn();
      setVirusScanHook(hook);
      expect(getVirusScanHook()).toBe(hook);
    });
  });
});
