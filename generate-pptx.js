const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

// Icons
const {
  FaFileAlt, FaCogs, FaRocket, FaUpload, FaComments,
  FaCode, FaBrain, FaChartLine, FaCheckCircle, FaLightbulb,
  FaDatabase, FaCloud, FaStar, FaGlobe, FaUsers,
  FaArrowRight, FaPlay, FaGraduationCap, FaTools,
  FaSearch, FaEdit, FaDownload, FaFileExport,
  FaDollarSign, FaClock, FaShieldAlt
} = require("react-icons/fa");

// ── Color Palette: Midnight Executive ──
const C = {
  navy:       "1E2761",
  navyDark:   "0F1639",
  iceBlue:    "CADCFC",
  white:      "FFFFFF",
  offWhite:   "F0F3FA",
  accent:     "3B82F6",
  accentLight:"60A5FA",
  textDark:   "1E293B",
  textMuted:  "64748B",
  green:      "10B981",
  orange:     "F59E0B",
  red:        "EF4444",
  purple:     "8B5CF6",
  teal:       "0D9488",
};

// ── Icon Renderer ──
function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// Helper: create shadow (fresh object each time)
const mkShadow = () => ({ type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 });

// Helper: draw a rounded card
function drawCard(slide, pres, x, y, w, h, fillColor = "FFFFFF") {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fillColor },
    shadow: mkShadow(),
  });
}

// ── MAIN ──
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "DocOct Team";
  pres.title = "DocOct - AI Research Paper Generator";

  // Pre-render all icons
  const icons = {};
  const iconDefs = [
    ["upload", FaUpload, C.accent],
    ["comments", FaComments, C.accent],
    ["code", FaCode, C.white],
    ["brain", FaBrain, C.white],
    ["chart", FaChartLine, C.green],
    ["check", FaCheckCircle, C.green],
    ["lightbulb", FaLightbulb, C.orange],
    ["database", FaDatabase, C.teal],
    ["cloud", FaCloud, C.accent],
    ["star", FaStar, C.orange],
    ["globe", FaGlobe, C.accent],
    ["users", FaUsers, C.purple],
    ["arrow", FaArrowRight, C.white],
    ["play", FaPlay, C.white],
    ["grad", FaGraduationCap, C.accent],
    ["tools", FaTools, C.teal],
    ["search", FaSearch, C.accent],
    ["edit", FaEdit, C.accent],
    ["download", FaDownload, C.green],
    ["export", FaFileExport, C.green],
    ["dollar", FaDollarSign, C.green],
    ["clock", FaClock, C.orange],
    ["shield", FaShieldAlt, C.teal],
    ["rocket", FaRocket, C.white],
    ["file", FaFileAlt, C.accent],
    ["cogs", FaCogs, C.teal],
  ];
  for (const [name, component, color] of iconDefs) {
    icons[name] = await iconToBase64Png(component, "#" + color, 256);
  }

  // ════════════════════════════════════════════
  // SLIDE 1: TITLE
  // ════════════════════════════════════════════
  const s1 = pres.addSlide();
  s1.background = { color: C.navyDark };

  // Decorative circle top-right
  s1.addShape(pres.shapes.OVAL, {
    x: 7.5, y: -1.5, w: 4, h: 4,
    fill: { color: C.navy, transparency: 60 },
  });
  // Decorative circle bottom-left
  s1.addShape(pres.shapes.OVAL, {
    x: -1, y: 3.5, w: 3, h: 3,
    fill: { color: C.navy, transparency: 60 },
  });

  // DocOct icon
  s1.addImage({ data: icons.cogs, x: 0.8, y: 1.2, w: 0.7, h: 0.7 });

  // Title
  s1.addText("DocOct", {
    x: 0.8, y: 1.9, w: 8, h: 1.2,
    fontSize: 52, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });

  // Tagline
  s1.addText("AI Research Paper Generator", {
    x: 0.8, y: 3.0, w: 8, h: 0.6,
    fontSize: 22, fontFace: "Calibri",
    color: C.iceBlue, margin: 0,
  });

  // Sub-tagline
  s1.addText("One upload. Two modes. Unlimited potential.", {
    x: 0.8, y: 3.7, w: 8, h: 0.5,
    fontSize: 14, fontFace: "Calibri", italic: true,
    color: C.textMuted, margin: 0,
  });

  // Live badge
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.5, w: 1.8, h: 0.35,
    fill: { color: C.green, transparency: 10 },
  });
  s1.addText("LIVE NOW", {
    x: 0.8, y: 4.5, w: 1.8, h: 0.35,
    fontSize: 10, fontFace: "Calibri", bold: true,
    color: C.white, align: "center", valign: "middle",
  });

  // URL
  s1.addText("sanir321-doc-oct.up.railway.app", {
    x: 2.8, y: 4.5, w: 4, h: 0.35,
    fontSize: 10, fontFace: "Calibri",
    color: C.iceBlue, valign: "middle",
  });

  // ════════════════════════════════════════════
  // SLIDE 2: THE PROBLEM
  // ════════════════════════════════════════════
  const s2 = pres.addSlide();
  s2.background = { color: C.offWhite };

  // Title
  s2.addText("The Problem", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });
  s2.addText("Academic writing is broken. Researchers deserve better.", {
    x: 0.7, y: 1.0, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Calibri", italic: true,
    color: C.textMuted, margin: 0,
  });

  // Problem cards - 2x2 grid
  const problems = [
    { icon: "clock", stat: "12+ hrs", label: "Average time spent\nformatting a single paper" },
    { icon: "search", stat: "73%", label: "Researchers struggle with\nIEEE/ACM formatting rules" },
    { icon: "file", stat: "5+", label: "Different format standards\nper conference/journal" },
    { icon: "shield", stat: "40%", label: "Papers rejected for\nformatting issues alone" },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.7 + col * 4.5;
    const y = 1.65 + row * 1.85;

    drawCard(s2, pres, x, y, 4.0, 1.55);

    // Accent bar left
    s2.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.55,
      fill: { color: C.accent },
    });

    s2.addImage({ data: icons[problems[i].icon], x: x + 0.25, y: y + 0.35, w: 0.4, h: 0.4 });

    s2.addText(problems[i].stat, {
      x: x + 0.8, y: y + 0.2, w: 3, h: 0.5,
      fontSize: 30, fontFace: "Georgia", bold: true,
      color: C.accent, margin: 0,
    });

    s2.addText(problems[i].label, {
      x: x + 0.8, y: y + 0.75, w: 3, h: 0.65,
      fontSize: 12, fontFace: "Calibri",
      color: C.textMuted, margin: 0,
    });
  }

  // ════════════════════════════════════════════
  // SLIDE 3: OUR SOLUTION
  // ════════════════════════════════════════════
  const s3 = pres.addSlide();
  s3.background = { color: C.navyDark };

  s3.addText("Our Solution", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });
  s3.addText("One upload. Two intelligent modes. Perfect output.", {
    x: 0.7, y: 1.0, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Calibri", italic: true,
    color: C.iceBlue, margin: 0,
  });

  // Two mode cards side by side
  // Mode 1: Research Paper
  drawCard(s3, pres, 0.7, 1.65, 4.0, 3.4);
  s3.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 1.65, w: 4.0, h: 0.06,
    fill: { color: C.accent },
  });
  s3.addImage({ data: icons.file, x: 1.0, y: 2.0, w: 0.5, h: 0.5 });
  s3.addText("Research Paper Mode", {
    x: 1.6, y: 2.0, w: 3, h: 0.5,
    fontSize: 18, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0, valign: "middle",
  });
  s3.addText([
    { text: "Upload any research paper", options: { bullet: true, breakLine: true } },
    { text: "AI interviews you about it", options: { bullet: true, breakLine: true } },
    { text: "Generates fresh, original paper", options: { bullet: true, breakLine: true } },
    { text: "ProCOMM / IEMT / PROCHIP / PSCC formats", options: { bullet: true, breakLine: true } },
    { text: "Full LaTeX + bibliography", options: { bullet: true } },
  ], {
    x: 1.0, y: 2.7, w: 3.5, h: 2.2,
    fontSize: 13, fontFace: "Calibri",
    color: C.textDark, paraSpaceAfter: 6,
  });

  // Mode 2: Resume
  drawCard(s3, pres, 5.3, 1.65, 4.0, 3.4);
  s3.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 1.65, w: 4.0, h: 0.06,
    fill: { color: C.green },
  });
  s3.addImage({ data: icons.users, x: 5.6, y: 2.0, w: 0.5, h: 0.5 });
  s3.addText("Resume Generator Mode", {
    x: 6.2, y: 2.0, w: 3, h: 0.5,
    fontSize: 18, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0, valign: "middle",
  });
  s3.addText([
    { text: "Upload resume + job description", options: { bullet: true, breakLine: true } },
    { text: "AI identifies skill gaps", options: { bullet: true, breakLine: true } },
    { text: "Recommends upskilling path", options: { bullet: true, breakLine: true } },
    { text: "Generates tailored resume", options: { bullet: true, breakLine: true } },
    { text: "ATS-optimized PDF output", options: { bullet: true } },
  ], {
    x: 5.6, y: 2.7, w: 3.5, h: 2.2,
    fontSize: 13, fontFace: "Calibri",
    color: C.textDark, paraSpaceAfter: 6,
  });

  // ════════════════════════════════════════════
  // SLIDE 4: KEY FEATURES
  // ════════════════════════════════════════════
  const s4 = pres.addSlide();
  s4.background = { color: C.offWhite };

  s4.addText("Key Features", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });

  const features = [
    { icon: "upload",  title: "Multi-Format Upload",   desc: "PDF, DOCX, images (OCR),\nPython, LaTeX, HTML" },
    { icon: "comments", title: "AI Interview",         desc: "Smart Q&A refines\nthe output to perfection" },
    { icon: "edit",    title: "Live Editor",            desc: "Edit generated content\nwith AI assist in real-time" },
    { icon: "code",    title: "Code Execution",         desc: "Run .py and .ipynb files\nfor analysis outputs" },
    { icon: "cloud",   title: "One-Click Export",       desc: "Download as HTML or PDF\nwith proper formatting" },
    { icon: "star",    title: "5 Paper Presets",        desc: "ProCOMM, IEMT, PROCHIP,\nPROCS, PSCC formats" },
  ];

  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.7 + col * 3.05;
    const y = 1.3 + row * 2.05;

    drawCard(s4, pres, x, y, 2.8, 1.75);

    // Icon in circle
    s4.addShape(pres.shapes.OVAL, {
      x: x + 0.2, y: y + 0.25, w: 0.55, h: 0.55,
      fill: { color: C.navy, transparency: 90 },
    });
    s4.addImage({ data: icons[features[i].icon], x: x + 0.28, y: y + 0.33, w: 0.4, h: 0.4 });

    s4.addText(features[i].title, {
      x: x + 0.9, y: y + 0.25, w: 1.8, h: 0.45,
      fontSize: 13, fontFace: "Georgia", bold: true,
      color: C.textDark, margin: 0, valign: "middle",
    });

    s4.addText(features[i].desc, {
      x: x + 0.2, y: y + 0.9, w: 2.4, h: 0.7,
      fontSize: 11, fontFace: "Calibri",
      color: C.textMuted, margin: 0,
    });
  }

  // ════════════════════════════════════════════
  // SLIDE 5: HOW IT WORKS
  // ════════════════════════════════════════════
  const s5 = pres.addSlide();
  s5.background = { color: C.navyDark };

  s5.addText("How It Works", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });
  s5.addText("From raw document to publication-ready output in minutes", {
    x: 0.7, y: 1.0, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Calibri", italic: true,
    color: C.iceBlue, margin: 0,
  });

  const steps = [
    { icon: "upload",  num: "1", title: "Upload",         desc: "Drop your PDF, DOCX,\nimage, or code file" },
    { icon: "search",  num: "2", title: "AI Analyzes",    desc: "NLP extracts structure,\ntopics, and key findings" },
    { icon: "comments", num: "3", title: "Interview",      desc: "Answer smart questions\nto refine the output" },
    { icon: "download", num: "4", title: "Export",         desc: "Download polished HTML\nor PDF in one click" },
  ];

  for (let i = 0; i < 4; i++) {
    const x = 0.5 + i * 2.4;
    const y = 1.8;

    // Step card
    s5.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.1, h: 3.0,
      fill: { color: C.navy },
      shadow: mkShadow(),
    });

    // Number circle
    s5.addShape(pres.shapes.OVAL, {
      x: x + 0.75, y: y + 0.3, w: 0.6, h: 0.6,
      fill: { color: C.accent },
    });
    s5.addText(steps[i].num, {
      x: x + 0.75, y: y + 0.3, w: 0.6, h: 0.6,
      fontSize: 20, fontFace: "Georgia", bold: true,
      color: C.white, align: "center", valign: "middle",
    });

    // Icon
    s5.addImage({ data: icons[steps[i].icon], x: x + 0.75, y: y + 1.15, w: 0.55, h: 0.55 });

    // Title
    s5.addText(steps[i].title, {
      x, y: y + 1.85, w: 2.1, h: 0.4,
      fontSize: 15, fontFace: "Georgia", bold: true,
      color: C.white, align: "center", margin: 0,
    });

    // Description
    s5.addText(steps[i].desc, {
      x: x + 0.15, y: y + 2.3, w: 1.8, h: 0.6,
      fontSize: 11, fontFace: "Calibri",
      color: C.iceBlue, align: "center", margin: 0,
    });

    // Arrow between steps (except last)
    if (i < 3) {
      s5.addImage({ data: icons.arrow, x: x + 2.1, y: y + 1.35, w: 0.3, h: 0.3 });
    }
  }

  // ════════════════════════════════════════════
  // SLIDE 6: TECH STACK
  // ════════════════════════════════════════════
  const s6 = pres.addSlide();
  s6.background = { color: C.offWhite };

  s6.addText("Technology Stack", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });

  // Left column: Architecture overview
  drawCard(s6, pres, 0.7, 1.3, 4.0, 3.9);
  s6.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 1.3, w: 4.0, h: 0.06,
    fill: { color: C.accent },
  });
  s6.addText("Architecture", {
    x: 1.0, y: 1.55, w: 3.5, h: 0.4,
    fontSize: 18, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });

  const archItems = [
    { icon: "cloud",  label: "Frontend",  detail: "React + Vite + Tailwind CSS" },
    { icon: "cogs",  label: "Backend",   detail: "FastAPI (Python 3.11+)" },
    { icon: "brain", label: "AI Engine",  detail: "OpenCode Zen (Nemotron Ultra)" },
    { icon: "database", label: "Storage", detail: "Cloudinary + Cloudflare R2" },
  ];
  for (let i = 0; i < 4; i++) {
    const yy = 2.15 + i * 0.75;
    s6.addImage({ data: icons[archItems[i].icon], x: 1.1, y: yy, w: 0.35, h: 0.35 });
    s6.addText(archItems[i].label, {
      x: 1.6, y: yy, w: 2.8, h: 0.25,
      fontSize: 12, fontFace: "Georgia", bold: true,
      color: C.textDark, margin: 0,
    });
    s6.addText(archItems[i].detail, {
      x: 1.6, y: yy + 0.25, w: 2.8, h: 0.25,
      fontSize: 11, fontFace: "Calibri",
      color: C.textMuted, margin: 0,
    });
  }

  // Right column: Key stats
  drawCard(s6, pres, 5.3, 1.3, 4.0, 1.8);
  s6.addText("By the Numbers", {
    x: 5.6, y: 1.5, w: 3.5, h: 0.35,
    fontSize: 16, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });

  const stats = [
    { num: "2,248", label: "Lines of Python" },
    { num: "1,244", label: "Lines of React" },
    { num: "15+",   label: "API Endpoints" },
  ];
  for (let i = 0; i < 3; i++) {
    const sx = 5.6 + i * 1.15;
    s6.addText(stats[i].num, {
      x: sx, y: 2.05, w: 1.1, h: 0.4,
      fontSize: 22, fontFace: "Georgia", bold: true,
      color: C.accent, align: "center", margin: 0,
    });
    s6.addText(stats[i].label, {
      x: sx, y: 2.45, w: 1.1, h: 0.3,
      fontSize: 9, fontFace: "Calibri",
      color: C.textMuted, align: "center", margin: 0,
    });
  }

  // Bottom right: Deployment
  drawCard(s6, pres, 5.3, 3.4, 4.0, 1.8);
  s6.addText("Deployment", {
    x: 5.6, y: 3.6, w: 3.5, h: 0.35,
    fontSize: 16, fontFace: "Georgia", bold: true,
    color: C.textDark, margin: 0,
  });
  s6.addImage({ data: icons.globe, x: 5.6, y: 4.1, w: 0.3, h: 0.3 });
  s6.addText("Railway (auto-scaling, global CDN)", {
    x: 6.0, y: 4.1, w: 3, h: 0.3,
    fontSize: 12, fontFace: "Calibri",
    color: C.textDark, margin: 0, valign: "middle",
  });
  s6.addImage({ data: icons.shield, x: 5.6, y: 4.5, w: 0.3, h: 0.3 });
  s6.addText("UptimeRobot monitoring (5-min pings)", {
    x: 6.0, y: 4.5, w: 3, h: 0.3,
    fontSize: 12, fontFace: "Calibri",
    color: C.textDark, margin: 0, valign: "middle",
  });

  // ════════════════════════════════════════════
  // SLIDE 7: MARKET OPPORTUNITY
  // ════════════════════════════════════════════
  const s7 = pres.addSlide();
  s7.background = { color: C.navyDark };

  s7.addText("Market Opportunity", {
    x: 0.7, y: 0.35, w: 9, h: 0.7,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });
  s7.addText("A $7B+ addressable market at the intersection of AI and academia", {
    x: 0.7, y: 1.0, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Calibri", italic: true,
    color: C.iceBlue, margin: 0,
  });

  // Big stat cards
  const marketStats = [
    { icon: "globe",   value: "$5.2B", label: "Academic Publishing\nTools Market", color: C.accent },
    { icon: "users",   value: "$1.8B", label: "Resume & Career\nServices Market", color: C.green },
    { icon: "rocket",  value: "32%",   label: "Annual Growth Rate\n(AI Writing Tools)", color: C.orange },
  ];

  for (let i = 0; i < 3; i++) {
    const mx = 0.7 + i * 3.1;
    s7.addShape(pres.shapes.RECTANGLE, {
      x: mx, y: 1.65, w: 2.8, h: 2.0,
      fill: { color: C.navy },
      shadow: mkShadow(),
    });
    // Accent top bar
    s7.addShape(pres.shapes.RECTANGLE, {
      x: mx, y: 1.65, w: 2.8, h: 0.06,
      fill: { color: marketStats[i].color },
    });

    s7.addImage({ data: icons[marketStats[i].icon], x: mx + 1.1, y: 1.9, w: 0.5, h: 0.5 });

    s7.addText(marketStats[i].value, {
      x: mx, y: 2.5, w: 2.8, h: 0.55,
      fontSize: 32, fontFace: "Georgia", bold: true,
      color: C.white, align: "center", margin: 0,
    });
    s7.addText(marketStats[i].label, {
      x: mx + 0.2, y: 3.1, w: 2.4, h: 0.5,
      fontSize: 12, fontFace: "Calibri",
      color: C.iceBlue, align: "center", margin: 0,
    });
  }

  // Target users
  s7.addText("Target Users", {
    x: 0.7, y: 3.95, w: 9, h: 0.4,
    fontSize: 16, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });

  const targets = [
    "Researchers & Academics",
    "Graduate Students (MS/PhD)",
    "Journal Authors & Reviewers",
    "Career Changers & Job Seekers",
  ];
  for (let i = 0; i < 4; i++) {
    s7.addImage({ data: icons.check, x: 0.7 + i * 2.3, y: 4.4, w: 0.25, h: 0.25 });
    s7.addText(targets[i], {
      x: 1.05 + i * 2.3, y: 4.4, w: 2.1, h: 0.25,
      fontSize: 11, fontFace: "Calibri",
      color: C.iceBlue, margin: 0, valign: "middle",
    });
  }

  // ════════════════════════════════════════════
  // SLIDE 8: CALL TO ACTION
  // ════════════════════════════════════════════
  const s8 = pres.addSlide();
  s8.background = { color: C.navyDark };

  // Decorative ovals
  s8.addShape(pres.shapes.OVAL, {
    x: -1.5, y: -1, w: 4, h: 4,
    fill: { color: C.navy, transparency: 60 },
  });
  s8.addShape(pres.shapes.OVAL, {
    x: 8, y: 3.5, w: 3.5, h: 3.5,
    fill: { color: C.navy, transparency: 60 },
  });

  s8.addText("Get Started Today", {
    x: 0.7, y: 0.8, w: 9, h: 0.9,
    fontSize: 42, fontFace: "Georgia", bold: true,
    color: C.white, align: "center", margin: 0,
  });

  s8.addText("Join researchers and professionals already using DocOct", {
    x: 1.5, y: 1.8, w: 7, h: 0.5,
    fontSize: 16, fontFace: "Calibri",
    color: C.iceBlue, align: "center", margin: 0,
  });

  // CTA button
  s8.addShape(pres.shapes.RECTANGLE, {
    x: 3.2, y: 2.6, w: 3.6, h: 0.65,
    fill: { color: C.accent },
    shadow: mkShadow(),
  });
  s8.addText("Launch DocOct  →", {
    x: 3.2, y: 2.6, w: 3.6, h: 0.65,
    fontSize: 18, fontFace: "Calibri", bold: true,
    color: C.white, align: "center", valign: "middle",
  });

  // URL
  s8.addText("sanir321-doc-oct.up.railway.app", {
    x: 2.5, y: 3.45, w: 5, h: 0.4,
    fontSize: 13, fontFace: "Calibri",
    color: C.iceBlue, align: "center", margin: 0,
  });

  // Key stats row
  const ctaStats = [
    { icon: "dollar", value: "FREE", label: "To Start" },
    { icon: "rocket", value: "5 min", label: "Setup Time" },
    { icon: "shield", value: "100%", label: "Cloud-Based" },
  ];
  for (let i = 0; i < 3; i++) {
    const cx = 1.5 + i * 2.6;
    s8.addImage({ data: icons[ctaStats[i].icon], x: cx, y: 4.15, w: 0.35, h: 0.35 });
    s8.addText(ctaStats[i].value, {
      x: cx + 0.45, y: 4.1, w: 1.5, h: 0.25,
      fontSize: 16, fontFace: "Georgia", bold: true,
      color: C.white, margin: 0,
    });
    s8.addText(ctaStats[i].label, {
      x: cx + 0.45, y: 4.35, w: 1.5, h: 0.2,
      fontSize: 11, fontFace: "Calibri",
      color: C.textMuted, margin: 0,
    });
  }

  // Footer
  s8.addText("Built with FastAPI  •  React  •  Nemotron Ultra  •  Railway", {
    x: 1.5, y: 4.9, w: 7, h: 0.3,
    fontSize: 10, fontFace: "Calibri",
    color: C.textMuted, align: "center", margin: 0,
  });

  // ── Save ──
  await pres.writeFile({ fileName: "C:/Users/PC/Desktop/unwanted/paper ai/DocOct-Pitch.pptx" });
  console.log("PPTX created: DocOct-Pitch.pptx");
}

main().catch(err => { console.error(err); process.exit(1); });
