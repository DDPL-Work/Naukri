const {
  extractPlaceholders,
  validateTemplate,
  fillTemplate,
  checkTemplateHtml,
} = require("../../../../src/email/validation/templates");
const TemplateValidationError = require("../../../../src/email/errors/TemplateValidationError");

describe("Template Validation", () => {
  describe("extractPlaceholders", () => {
    test("extracts ${name} style placeholders", () => {
      const result = extractPlaceholders("Hello ${name}, your code is ${code}");
      expect(result).toEqual(expect.arrayContaining(["name", "code"]));
      expect(result.length).toBe(2);
    });

    test("returns empty for no placeholders", () => {
      expect(extractPlaceholders("Hello world")).toEqual([]);
    });

    test("returns empty for non-string", () => {
      expect(extractPlaceholders(null)).toEqual([]);
      expect(extractPlaceholders(undefined)).toEqual([]);
      expect(extractPlaceholders(123)).toEqual([]);
    });

    test("deduplicates repeated placeholders", () => {
      const result = extractPlaceholders("${name} and ${name} again");
      expect(result).toEqual(["name"]);
    });
  });

  describe("validateTemplate", () => {
    test("passes when all placeholders have values", () => {
      const errors = validateTemplate(
        "Hello ${name}",
        { name: "John" },
        { templateName: "test" }
      );
      expect(errors.length).toBe(0);
    });

    test("detects missing placeholders", () => {
      const errors = validateTemplate(
        "Hello ${name}, code: ${code}",
        { name: "John" },
        { templateName: "test" }
      );
      expect(errors.length).toBe(1);
      expect(errors[0]).toBeInstanceOf(TemplateValidationError);
      expect(errors[0].missingPlaceholders).toContain("code");
    });

    test("detects missing required variables", () => {
      const errors = validateTemplate(
        "Hello ${name}",
        { name: "John" },
        { templateName: "test", required: ["name", "email"] }
      );
      expect(errors.length).toBe(1);
      expect(errors[0].missingPlaceholders).toContain("email");
    });

    test("detects extra variables in strict mode", () => {
      const errors = validateTemplate(
        "Hello ${name}",
        { name: "John", extra: "unused" },
        { templateName: "test", strict: true }
      );
      expect(errors.length).toBe(1);
      expect(errors[0].extraVariables).toContain("extra");
    });

    test("throws for non-string template", () => {
      expect(() => validateTemplate(null, {})).toThrow(TemplateValidationError);
    });

    test("throws for non-object variables", () => {
      expect(() => validateTemplate("Hello", null)).toThrow(TemplateValidationError);
    });
  });

  describe("fillTemplate", () => {
    test("fills placeholders with values", () => {
      const result = fillTemplate(
        "Hello ${name}, your OTP is ${otp}",
        { name: "John", otp: "123456" }
      );
      expect(result).toBe("Hello John, your OTP is 123456");
    });

    test("throws on missing placeholders", () => {
      expect(() =>
        fillTemplate("Hello ${name}", {}, { templateName: "test" })
      ).toThrow(TemplateValidationError);
    });

    test("leaves unfilled placeholders when missing", () => {
      expect(() =>
        fillTemplate("Hello ${name}", {})
      ).toThrow();
    });
  });

  describe("checkTemplateHtml", () => {
    test("passes for valid HTML with all variables", () => {
      const errors = checkTemplateHtml(
        "<h1>Hello ${name}</h1>",
        { name: "John" }
      );
      expect(errors.length).toBe(0);
    });

    test("detects missing variables in HTML", () => {
      const errors = checkTemplateHtml(
        "<h1>Hello ${name}</h1><p>Code: ${code}</p>",
        { name: "John" }
      );
      expect(errors.length).toBe(1);
      expect(errors[0].missingPlaceholders).toContain("code");
    });
  });
});
