const crypto = require("crypto");

const TOKEN_EXPIRY_HOURS = 72;
const SECRET = process.env.JWT_SECRET || "unsubscribe-default-secret";

function generateUnsubscribeToken(userId, email, purpose = "recommendations") {
  const payload = {
    userId: String(userId),
    email,
    purpose,
    expiresAt: Date.now() + TOKEN_EXPIRY_HOURS * 3600000,
  };

  const data = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha256").update(SECRET).digest(), iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const token = iv.toString("hex") + ":" + encrypted;
  return { token, payload };
}

function verifyUnsubscribeToken(token) {
  try {
    const parts = token.split(":");
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha256").update(SECRET).digest(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const payload = JSON.parse(decrypted);

    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}

module.exports = { generateUnsubscribeToken, verifyUnsubscribeToken, TOKEN_EXPIRY_HOURS };
