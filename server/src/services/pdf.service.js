const PDFDocument = require("pdfkit");
const axios = require("axios");

async function fetchImage(url) {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
  return Buffer.from(response.data);
}

async function fetchImageSafe(url, label) {
  const safeUrl = typeof url === "string" ? url.trim() : "";
  if (!safeUrl) {
    return null;
  }

  try {
    return await fetchImage(safeUrl);
  } catch (error) {
    console.warn(`Failed to fetch ${label}:`, error?.message || error);
    return null;
  }
}

/**
 * Sanitize text for PDFKit's WinAnsiEncoding (built-in Helvetica/Times).
 * Replaces common Unicode symbols with ASCII equivalents, then strips any
 * remaining characters outside the WinAnsi range (0x00-0xFF).
 */
function sanitize(str) {
  if (!str) return "";

  return String(str)
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022|\u2023|\u25CF/g, "-")
    .replace(/\u25BA/g, ">")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2713|\u2714/g, "(ok)")
    .replace(/\u2715|\u2716/g, "(x)")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2000}-\u{206F}]/gu, " ")
    .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/  +/g, " ")
    .trim();
}

function drawMavenWordmark(doc, pageWidth, y, height = 40) {
  const badgeWidth = 200;
  const badgeHeight = height;
  const badgeX = (pageWidth - badgeWidth) / 2;

  doc
    .roundedRect(badgeX, y, badgeWidth, badgeHeight, 10)
    .fillAndStroke("#f3f8ff", "#d2e0f2");

  doc.circle(badgeX + 16, y + badgeHeight / 2, 5).fill("#a7d933");

  doc
    .fillColor("#163060")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("MAVEN JOBS", badgeX + 28, y + 11, {
      width: badgeWidth - 36,
      align: "left",
      lineBreak: false,
    });
}

exports.generateCompanyQRPDF = async ({ company, jobs = [], qrImageUrl }) => {
  void jobs;

  const PAGE_W = 595.28; // A4 width in points
  const PAGE_H = 841.89; // A4 height in points
  const MARGIN = 60;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const doc = new PDFDocument({ size: "A4", margin: 0 });

  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const pdfDone = new Promise((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(buffers))),
  );

  const qrBuffer = await fetchImage(qrImageUrl);

  const logoBuffer = await fetchImageSafe(company?.logoUrl, "company logo for QR PDF");

  const mavenBrandLogoUrl =
    process.env.MAVEN_BRAND_LOGO_URL || process.env.MAVEN_LOGO_URL || "";
  const mavenBrandLogoBuffer = await fetchImageSafe(
    mavenBrandLogoUrl,
    "MavenJobs brand logo for QR PDF",
  );

  const companyName = sanitize(company?.name) || "Client";
  const tagline = sanitize(company?.tagline);
  const companyInitial = companyName.charAt(0).toUpperCase() || "C";

  const COLORS = {
    primary: "#163060",
    secondary: "#2f5ca1",
    accent: "#a7d933",
    headingText: "#112a52",
    bodyText: "#4a668f",
    mutedText: "#6f86ab",
    border: "#d7e3f3",
    panel: "#f5f9ff",
    panelSoft: "#fbfdff",
  };

  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#ffffff");
  doc.rect(0, 0, PAGE_W, 12).fill(COLORS.primary);
  doc.rect(PAGE_W * 0.66, 0, PAGE_W * 0.34, 12).fill(COLORS.accent);

  const companyLogoSize = 96;
  const companyLogoX = (PAGE_W - companyLogoSize) / 2;
  const companyLogoY = 54;

  doc
    .roundedRect(companyLogoX - 12, companyLogoY - 12, companyLogoSize + 24, companyLogoSize + 24, 16)
    .fillAndStroke(COLORS.panel, COLORS.border);

  let hasRenderedCompanyLogo = false;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, companyLogoX, companyLogoY, {
        fit: [companyLogoSize, companyLogoSize],
        align: "center",
        valign: "center",
      });
      hasRenderedCompanyLogo = true;
    } catch (error) {
      console.warn("Failed to render company logo in QR PDF:", error?.message || error);
    }
  }

  if (!hasRenderedCompanyLogo) {
    doc
      .fillColor(COLORS.primary)
      .font("Helvetica-Bold")
      .fontSize(40)
      .text(companyInitial, companyLogoX, companyLogoY + 26, {
        width: companyLogoSize,
        align: "center",
      });
  }

  const companyNameFontSize = companyName.length > 30 ? 24 : 29;
  doc
    .fillColor(COLORS.headingText)
    .font("Helvetica-Bold")
    .fontSize(companyNameFontSize)
    .text(companyName, MARGIN, companyLogoY + companyLogoSize + 28, {
      width: CONTENT_W,
      align: "center",
    });

  let headerBottomY = doc.y;

  if (tagline) {
    doc
      .fillColor(COLORS.bodyText)
      .font("Helvetica")
      .fontSize(12)
      .text(tagline, MARGIN, headerBottomY + 12, { width: CONTENT_W, align: "center" });
    headerBottomY = doc.y;
  }

  const dividerTop = Math.max(232, headerBottomY + 22);
  doc
    .moveTo(MARGIN, dividerTop)
    .lineTo(PAGE_W - MARGIN, dividerTop)
    .lineWidth(1)
    .stroke(COLORS.border);

  const panelWidth = 344;
  const panelHeight = 356;
  const panelX = (PAGE_W - panelWidth) / 2;
  const panelY = dividerTop + 28;

  doc
    .roundedRect(panelX, panelY, panelWidth, panelHeight, 24)
    .fillAndStroke(COLORS.panelSoft, COLORS.border);

  doc
    .fillColor(COLORS.secondary)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("SCAN TO OPEN MAVEN JOBS", panelX + 20, panelY + 16, {
      width: panelWidth - 40,
      align: "center",
    });

  const QR_SIZE = 248;
  const qrX = panelX + (panelWidth - QR_SIZE) / 2;
  const qrY = panelY + 56;
  const qrCardPadding = 16;

  doc
    .roundedRect(
      qrX - qrCardPadding,
      qrY - qrCardPadding,
      QR_SIZE + qrCardPadding * 2,
      QR_SIZE + qrCardPadding * 2,
      18,
    )
    .lineWidth(1)
    .stroke(COLORS.border);

  doc.image(qrBuffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

  const footerDivider = PAGE_H - 138;
  doc
    .moveTo(MARGIN, footerDivider)
    .lineTo(PAGE_W - MARGIN, footerDivider)
    .lineWidth(1)
    .stroke(COLORS.border);

  const footerBrandY = PAGE_H - 112;

  if (mavenBrandLogoBuffer) {
    try {
      const brandW = 190;
      const brandH = 44;
      doc.image(mavenBrandLogoBuffer, (PAGE_W - brandW) / 2, footerBrandY, {
        fit: [brandW, brandH],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      console.warn("Failed to render MavenJobs brand logo in QR PDF:", error?.message || error);
      drawMavenWordmark(doc, PAGE_W, footerBrandY + 4);
    }
  } else {
    drawMavenWordmark(doc, PAGE_W, footerBrandY + 4);
  }

  doc
    .fillColor(COLORS.mutedText)
    .font("Helvetica")
    .fontSize(10.5)
    .text("Powered by Maven Jobs", MARGIN, PAGE_H - 58, {
      width: CONTENT_W,
      align: "center",
    });

  doc.end();

  return pdfDone;
};
