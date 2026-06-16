describe("NotificationPreferences Model Schema", () => {
  test("schema has required fields with correct types", () => {
    const schema = require("../../../src/models/NotificationPreferences").schema;
    expect(schema.paths.userId).toBeDefined();
    expect(schema.paths.userId.options.required).toBe(true);
    expect(schema.paths.role).toBeDefined();
    expect(schema.paths.role.options.required).toBe(true);
    expect(schema.paths.role.options.enum).toContain("CANDIDATE");
    expect(schema.paths.role.options.enum).toContain("RECRUITER");
    expect(schema.paths.role.options.enum).toContain("ADMIN");
    expect(schema.paths.applicationUpdates).toBeDefined();
    expect(schema.paths.applicationUpdates.options.default).toBe(true);
    expect(schema.paths.marketingEmails).toBeDefined();
    expect(schema.paths.marketingEmails.options.default).toBe(true);
    expect(schema.paths.jobRecommendations).toBeDefined();
    expect(schema.paths.jobRecommendations.options.default).toBe(true);
    expect(schema.paths.blogUpdates).toBeDefined();
    expect(schema.paths.blogUpdates.options.default).toBe(true);
  });

  test("schema has unique compound index on userId + role", () => {
    const schema = require("../../../src/models/NotificationPreferences").schema;
    const index = schema.indexes().find((idx) => {
      return idx[0].userId === 1 && idx[0].role === 1;
    });
    expect(index).toBeDefined();
    expect(index[1].unique).toBe(true);
  });

  test("schema has timestamps", () => {
    const schema = require("../../../src/models/NotificationPreferences").schema;
    expect(schema.options.timestamps).toBe(true);
  });
});
