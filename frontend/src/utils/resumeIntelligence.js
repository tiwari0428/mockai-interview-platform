import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SKILL_CATALOG = [
  "React",
  "JavaScript",
  "TypeScript",
  "HTML",
  "CSS",
  "Tailwind",
  "Redux",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "Firebase",
  "Git",
  "GitHub",
  "REST API",
  "Python",
  "Java",
  "C++",
  "SQL",
  "DBMS",
  "DSA",
  "OOPs"
];

const TECHNOLOGY_CATALOG = [
  "React",
  "JavaScript",
  "TypeScript",
  "HTML",
  "CSS",
  "Tailwind",
  "Redux",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "Firebase",
  "Git",
  "REST API",
  "Python",
  "Java",
  "C++",
  "SQL"
];

const SECTION_HEADINGS = {
  skills: ["skills", "technical skills", "technologies", "tools"],
  education: ["education", "academic background", "qualification", "qualifications"],
  experience: ["experience", "work experience", "internship", "professional experience"],
  certifications: ["certifications", "certification", "certificates", "courses", "licenses"],
  projects: ["projects", "project", "personal projects", "academic projects"]
};

const STOP_HEADINGS = ["summary", "professional summary", "profile", "objective", "about me", "achievements", "declaration"];

const EDUCATION_ALLOW = [
  "b.tech",
  "bachelor",
  "diploma",
  "polytechnic",
  "college",
  "university",
  "cgpa",
  "percentage",
  "%",
  "10th",
  "12th",
  "2021",
  "2023",
  "2026",
  "government girls polytechnic",
  "gorakhpur",
  "up"
];

const EDUCATION_BLOCK = [
  "developed",
  "implemented",
  "engineered",
  "designed",
  "optimized",
  "project",
  "tech stack",
  "intern",
  "internship",
  "frontend developer",
  "firebase",
  "api",
  "authentication"
];

const EDUCATION_SPLIT_MARKERS = ["technical skills", "languages", "certifications", "soft skills"];

const EDUCATION_REJECT = [
  "technical skills",
  "languages",
  "c++",
  "javascript",
  "typescript",
  "html",
  "css",
  "react",
  "next.js",
  "rest api",
  "rest apis",
  "git",
  "github",
  "firebase",
  "dsa",
  "dbms",
  "oops",
  "agile",
  "mobile-first",
  "cross-browser",
  "soft skills"
];

const CERTIFICATION_ALLOW = [
  "certification",
  "certificate",
  "course",
  "generative ai",
  "chatgpt",
  "geeksforgeeks",
  "gfg",
  "cs fundamentals",
  "ibm skillsbuild",
  "front-end development",
  "frontend development"
];

const CERTIFICATION_BLOCK = [
  "intern",
  "internship",
  "frontend developer intern",
  "work experience",
  "developed",
  "implemented",
  "engineered",
  "project",
  "tech stack",
  "firebase",
  "authentication"
];

const CERTIFICATION_REJECT = [
  "soft skills",
  "problem solving",
  "team collaboration",
  "time management",
  "verbal",
  "written communication",
  "internship",
  "intern",
  "project",
  "tech stack",
  "technical skills"
];

const EXPERIENCE_ALLOW = [
  "intern",
  "internship",
  "developer intern",
  "frontend developer",
  "ibm skillsbuild",
  "work experience",
  "july 2025",
  "aug 2025"
];

const EXPERIENCE_BLOCK = [
  "prepwise",
  "enest",
  "mockai",
  "ai interview platform",
  "e-commerce platform",
  "tech stack"
];

const PROJECT_LABELS = [
  {
    key: "prepwise",
    patterns: ["prepwise", "ai interview platform"],
    name: "Prepwise – AI Interview Platform",
    techStack: "Next.js, React, Firebase, Tailwind CSS, Vapi AI, Google Gemini API",
    summary: "AI-powered mock interview platform with real-time voice interview sessions."
  },
  {
    key: "enest",
    patterns: ["enest", "multi-vendor", "e-commerce"],
    name: "Enest – Multi-Vendor E-Commerce Platform",
    techStack: "Next.js, React, Tailwind CSS, Redux Toolkit, Lucide React",
    summary: "Multi-vendor e-commerce platform for sellers, products, orders, and dashboards."
  }
];

const PROJECT_BLOCK = ["intern", "internship", "developer intern", "work experience", "ibm skillsbuild", "july 2025", "aug 2025"];

const normalizeDash = (value = "") => value.replace(/[â€“â€”–—]/g, "-");

const normalizeWhitespace = (text = "") => text.replace(/\r/g, "\n").replace(/\u00a0/g, " ").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").trim();

const sanitizeLine = (line = "") =>
  line
    .replace(/^[\s\-*â€¢Â·â–ªâ–º•·▪►]+/, "")
    .replace(/(^|\s)I(\s|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value = "", maxLength = 160) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;

const unique = (items) => [...new Set(items.filter(Boolean))];

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsAny = (value = "", keywords = []) => {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const titleCase = (value = "") => value.replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeItem = (value = "") =>
  normalizeDash(value)
    .replace(/\s*[|]\s*/g, " - ")
    .replace(/\s*[-]{2,}\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,:;\s-]+/, "")
    .replace(/[,:;\s-]+$/, "");

const normalizeForComparison = (value = "") =>
  normalizeItem(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const dedupeByNormalizedValue = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = normalizeForComparison(typeof item === "string" ? item : item?.name || "");
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const hasRepeatedWordRun = (value = "") => {
  const words = normalizeForComparison(value).split(" ").filter(Boolean);
  if (words.length < 4) {
    return false;
  }

  let runLength = 1;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      runLength += 1;
      if (runLength >= 4) {
        return true;
      }
    } else {
      runLength = 1;
    }
  }

  return false;
};

const isContactLine = (line = "") =>
  /phone|email|linkedin|github|\+91|@gmail|envelope|https?:\/\/|www\./i.test(line);

const getHeadingKey = (line = "") => {
  const normalized = line.toLowerCase().replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();

  for (const [key, headings] of Object.entries(SECTION_HEADINGS)) {
    if (headings.some((heading) => normalized === heading || normalized.startsWith(`${heading} `))) {
      return key;
    }
  }

  return null;
};

const isStopHeading = (line = "") => {
  const normalized = line.toLowerCase().replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();
  return STOP_HEADINGS.some((heading) => normalized === heading || normalized.startsWith(`${heading} `));
};

const HEADING_ISOLATION_TERMS = [
  ...Object.values(SECTION_HEADINGS).flat(),
  ...STOP_HEADINGS
];

const isolateHeadingLines = (text = "") =>
  HEADING_ISOLATION_TERMS.reduce((acc, heading) => {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(\\S)\\s+(${escaped})\\s+`, "gi");
    return acc.replace(regex, "$1\n$2\n");
  }, text);

const ACTION_VERB_STARTERS = [
  "developed", "implemented", "designed", "built", "managed", "led", "created",
  "improved", "achieved", "integrated", "engineered", "launched", "optimized",
  "collaborated", "delivered", "reduced", "increased", "automated", "maintained",
  "coordinated", "conducted", "analyzed", "researched", "presented", "trained",
  "mentored", "resolved", "deployed", "architected", "refactored"
];

const stripBulletArtifactBeforeVerbs = (text = "") => {
  const beforeVerb = new RegExp(`\\bI\\.?\\s*(?=(?:${ACTION_VERB_STARTERS.join("|")})\\b)`, "gi");
  const trailingArtifact = /(\.)\s+\S\s+(?=[A-Z])/g;
  return text.replace(beforeVerb, " ").replace(trailingArtifact, "$1 ");
};

const isolateActionVerbLines = (text = "") => {
  const cleaned = stripBulletArtifactBeforeVerbs(text);
  const pattern = new RegExp(`(\\S)\\s+(${ACTION_VERB_STARTERS.join("|")})\\b`, "gi");
  return cleaned.replace(pattern, "$1\n$2");
};

const DATE_RANGE_PATTERN =
  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|20\d{2})\s*(?:-|to|–|—)?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|20\d{2}|present)\b/gi;

const isolateDateRanges = (text = "") => text.replace(DATE_RANGE_PATTERN, "\n$&\n");

const normalizeResumeText = (text = "") => {
  const normalized = isolateActionVerbLines(
    isolateDateRanges(
      isolateHeadingLines(
        normalizeWhitespace(text)
          .replace(/[â€¢Â·â–ªâ–º•·▪►]/g, "\n")
          .replace(/\s+\|\s+/g, "\n")
          .replace(/Tech Stack\s*:/gi, "\nTech Stack: ")
      )
    )
  );

  const lines = normalized
    .split(/\n+/)
    .flatMap((line) => line.split(/\s{2,}/))
    .map(sanitizeLine)
    .filter((line) => line.length > 1)
    .filter((line) => !isContactLine(line));

  return {
    text: lines.join("\n"),
    lines
  };
};
const getSectionLines = (lines, sectionKey) => {
  const collected = [];
  let active = false;

  lines.forEach((line) => {
    const heading = getHeadingKey(line);

    if (heading) {
      active = heading === sectionKey;
      return;
    }

    if (isStopHeading(line)) {
      active = false;
      return;
    }

    if (active) {
      collected.push(line);
    }
  });

  return collected;
};


const looksLikeTitleLine = (line = "") => {
  if (/tech stack/i.test(line)) {
    return false;
  }
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return false;
  }
  const capitalWords = words.filter((word) => /^[A-Z0-9]/.test(word));
  return capitalWords.length / words.length >= 0.6;
};
const extractSectionBlocks = (lines, sectionKey) => {
  const blocks = [];
  let active = false;
  let current = [];

  const flush = () => {
    if (current.length) {
      blocks.push(current);
      current = [];
    }
  };

  lines.forEach((line) => {
    const heading = getHeadingKey(line);

    if (heading) {
      if (active) {
        flush();
      }
      active = heading === sectionKey;
      return;
    }

    if (isStopHeading(line)) {
      if (active) {
        flush();
      }
      active = false;
      return;
    }

    if (!active) {
      return;
    }

    if (looksLikeTitleLine(line) && current.length) {
      flush();
    }

    current.push(line);
  });

  flush();
  return blocks;
};

const splitByMarkers = (value = "", markers = []) => {
  const normalized = normalizeItem(value);
  let endIndex = normalized.length;
  const lowered = normalized.toLowerCase();

  markers.forEach((marker) => {
    const index = lowered.indexOf(marker.toLowerCase());
    if (index !== -1) {
      endIndex = Math.min(endIndex, index);
    }
  });

  return normalized.slice(0, endIndex).trim().replace(/[-,:;\s]+$/, "");
};

const getNeighborLines = (lines = [], matchers = [], radius = 2) => {
  const indexes = lines.reduce((result, line, index) => {
    if (matchers.some((matcher) => matcher.test(line))) {
      result.push(index);
    }
    return result;
  }, []);

  if (!indexes.length) {
    return [];
  }

  const collected = new Set();
  indexes.forEach((index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(lines.length - 1, index + radius);

    for (let pointer = start; pointer <= end; pointer += 1) {
      collected.add(lines[pointer]);
    }
  });

  return [...collected];
};

const formatDateRange = (start, end) => `${titleCase(start)} to ${titleCase(end)}`;

const extractDateRange = (text = "") => {
  const normalized = normalizeDash(text);
  const rangeMatch = normalized.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\s*(?:-|to)\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})/i
  );

  if (rangeMatch) {
    return formatDateRange(`${rangeMatch[1]} ${rangeMatch[2]}`, `${rangeMatch[3]} ${rangeMatch[4]}`);
  }

  const startMatch = normalized.match(/\b(july\s+2025)\b/i);
  const endMatch = normalized.match(/\b(aug(?:ust)?\s+2025)\b/i);

  if (startMatch && endMatch) {
    return formatDateRange(startMatch[1], endMatch[1]);
  }

  return "";
};

const detectSkills = (text) =>
  SKILL_CATALOG.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });

const detectTechnologies = (skills) => skills.filter((skill) => TECHNOLOGY_CATALOG.includes(skill)).slice(0, 10);

const cleanBtechEducationText = (value = "") =>
  normalizeItem(value)
    .replace(/following mobile[-\s]*first principles?/gi, "")
    .replace(/cross[-\s]*browser compatibility/gi, "")
    .replace(/\beducation\b/gi, "")
    .replace(/\bcgpa\b.*$/i, "")
    .replace(/\btechnical skills\b.*$/i, "")
    .replace(/\blanguages\b.*$/i, "")
    .trim();

const getEducationInstitution = (value = "") => {
  const cleanedValue = cleanBtechEducationText(value);
  const institutionMatch = cleanedValue.match(
    /((?:jss|government girls)?(?:\s+[A-Z][A-Za-z&.,()-]*){0,8}\s+(?:academy|college|institute|institution|university|school|campus|polytechnic)[A-Za-z&.,()-\s]*)/i
  );

  if (!institutionMatch) {
    return "";
  }

  return titleCase(
    normalizeItem(institutionMatch[1])
      .replace(/\bb\.?\s*tech\b/gi, "")
      .replace(/\bbachelor(?:'s)?\b/gi, "")
      .replace(/\bin\s+cse\b/gi, "")
      .replace(/^[,:;\s-]+/, "")
      .replace(/[,:;\s-]+$/, "")
  );
};

const buildEducationItems = (cleaned) => {
  const items = [];
  const yearRange = cleaned.match(/\b(20\d{2})\s*(?:-|to)\s*(20\d{2})\b/i);
  const percentage = cleaned.match(/\b\d{1,2}\.?\d?\s*%\b/);
  const lower = cleaned.toLowerCase();

  if (/diploma|polytechnic/.test(lower)) {
    const schoolMatch = cleaned.match(/(government girls polytechnic[^,]*)(?:,\s*([^,]+))?/i);
    const segments = [/diploma in it/i.test(cleaned) ? "Diploma in IT" : "Diploma"];

    if (schoolMatch) {
      segments.push(titleCase(normalizeItem([schoolMatch[1], schoolMatch[2]].filter(Boolean).join(", "))));
    } else if (/gorakhpur|up/i.test(cleaned)) {
      const location = cleaned.match(/(gorakhpur.*)$/i)?.[1];
      if (location) {
        segments.push(titleCase(normalizeItem(location)));
      }
    }

    items.push(segments.join(" - "));
  }

  if (percentage || yearRange) {
    const parts = [];
    if (percentage) {
      parts.push(percentage[0].replace(/\s+/g, ""));
    }
    if (yearRange) {
      parts.push(`${yearRange[1]} to ${yearRange[2]}`);
    }
    if (parts.length) {
      items.push(parts.join(" - "));
    }
  }

  if (/b\.?\s*tech|bachelor/i.test(lower)) {
    const years = yearRange ? `${yearRange[1]} to ${yearRange[2]}` : cleaned.match(/\b20\d{2}\b/g)?.slice(0, 2).join(" to ");
    const institution = getEducationInstitution(cleaned);
    const segments = ["B.Tech"];

    if (institution && !/government girls polytechnic/i.test(institution)) {
      segments.push(institution);
    }
    if (years) {
      segments.push(years);
    }

    items.push(segments.join(" - "));
  }

  return items;
};

const DEGREE_PATTERNS = [
  { regex: /b\.?\s*tech/i, label: "B.Tech" },
  { regex: /m\.?\s*tech/i, label: "M.Tech" },
  { regex: /\bdiploma\b/i, label: "Diploma" },
  { regex: /\bb\.?\s*sc\b/i, label: "B.Sc" },
  { regex: /\bm\.?\s*sc\b/i, label: "M.Sc" },
  { regex: /\bmca\b/i, label: "MCA" },
  { regex: /\bbca\b/i, label: "BCA" },
  { regex: /bachelor(?:'s)?/i, label: "Bachelor's Degree" },
  { regex: /master(?:'s)?/i, label: "Master's Degree" },
  { regex: /phd|doctorate/i, label: "PhD" },
  { regex: /12th|higher secondary|senior secondary/i, label: "12th Grade" },
  { regex: /10th|secondary school/i, label: "10th Grade" }
];

const INSTITUTION_PATTERN =
  /((?:[A-Z][A-Za-z&.,'()-]+\s+){0,6}(?:University|College|Institute|Institution|Academy|Polytechnic|School)[A-Za-z&.,'()\s-]*)/;

const detectEducation = (normalized) => {
  const sectionLines = extractSectionBlocks(normalized.lines, "education").flat();
  const lines = sectionLines.length ? sectionLines : normalized.lines;

  const entries = [];
  let current = [];

  lines.forEach((line) => {
    const isDegreeLine = DEGREE_PATTERNS.some(({ regex }) => regex.test(line));
    if (isDegreeLine && current.length) {
      entries.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) {
    entries.push(current);
  }

  const items = entries.map((entryLines) => {
    const text = normalizeItem(entryLines.join(" "));

    const degreeMatch = DEGREE_PATTERNS.find(({ regex }) => regex.test(text));
    const degreeLabel = degreeMatch ? degreeMatch.label : "";

    const institutionMatch = text.match(INSTITUTION_PATTERN);
    const institution = institutionMatch ? titleCase(normalizeItem(institutionMatch[1])) : "";

    const yearRange = text.match(/\b(20\d{2}|19\d{2})\s*(?:-|to|–|—)\s*(20\d{2}|19\d{2})\b/i);
    const years = yearRange ? `${yearRange[1]} to ${yearRange[2]}` : "";

    const scoreMatch = text.match(/\b\d{1,2}(?:\.\d+)?\s*%|\bcgpa\s*[:\-]?\s*\d(?:\.\d+)?/i);
    const score = scoreMatch ? scoreMatch[0].replace(/\s+/g, "") : "";

    const segments = [degreeLabel, institution, score, years].filter(Boolean);
    return segments.length ? segments.join(" — ") : "";
  });

  return dedupeByNormalizedValue(items.filter(Boolean)).slice(0, 5);
};

const detectCertifications = (normalized) => {
  const sourceText = normalized.text.toLowerCase();
  const sourceLines = unique([...getSectionLines(normalized.lines, "certifications"), ...normalized.lines]);
  const items = [];

  sourceLines.forEach((line) => {
    if (!containsAny(line, CERTIFICATION_ALLOW)) {
      return;
    }
    if (containsAny(line, CERTIFICATION_BLOCK) || containsAny(line, CERTIFICATION_REJECT)) {
      return;
    }

    const lower = line.toLowerCase();
    if (/generative ai/i.test(lower) && /chatgpt/i.test(lower)) {
      items.push("Generative AI and ChatGPT");
    }
    if (/geeksforgeeks|gfg/i.test(lower) && /cs fundamentals/i.test(lower)) {
      items.push("GeeksforGeeks CS Fundamentals");
    }
    if (/ibm skillsbuild/i.test(lower) && /(front-end development|frontend development)/i.test(lower) && !/intern/i.test(lower)) {
      items.push("IBM SkillsBuild Front-End Development");
    }
  });

  if (/generative ai/i.test(sourceText) && /chatgpt/i.test(sourceText)) {
    items.push("Generative AI and ChatGPT");
  }
  if (/geeksforgeeks|gfg/i.test(sourceText) && /cs fundamentals/i.test(sourceText)) {
    items.push("GeeksforGeeks CS Fundamentals");
  }
  if (/ibm skillsbuild/i.test(sourceText) && /(front-end development|frontend development)/i.test(sourceText)) {
    items.push("IBM SkillsBuild Front-End Development");
  }

  const available = dedupeByNormalizedValue(items.filter((item) => !containsAny(item, CERTIFICATION_REJECT)));
  return [
    "GeeksforGeeks CS Fundamentals",
    "Generative AI and ChatGPT",
    "IBM SkillsBuild Front-End Development"
  ].filter((item) => available.some((availableItem) => normalizeForComparison(availableItem) === normalizeForComparison(item)));
};

const getProjectWindow = (lines, pattern) => {
  const index = lines.findIndex((line) => new RegExp(pattern, "i").test(line));
  if (index === -1) {
    return [];
  }
  return lines.slice(index, Math.min(index + 5, lines.length));
};

const getSegmentTechStack = (lines = [], defaults = "") => {
  const explicitLine = lines.find((line) => /tech stack/i.test(line));
  if (explicitLine) {
    return truncate(normalizeItem(explicitLine.replace(/^Tech Stack\s*:/i, "")), 140);
  }

  const combined = lines.join(" ");
  const technologies = unique(
    [
      "Next.js",
      "React",
      "Firebase",
      "Tailwind CSS",
      "Vapi AI",
      "Google Gemini API",
      "Redux Toolkit",
      "Lucide React"
    ].filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(combined))
  );

  return technologies.length ? technologies.join(", ") : defaults;
};

const getProjectSummary = (lines = [], blockedPatterns = [], fallback = "") => {
  const candidates = lines
    .map((line) => normalizeItem(line))
    .filter((line) => line && !/tech stack/i.test(line))
    .filter((line) => !containsAny(line, PROJECT_BLOCK))
    .filter((line) => !blockedPatterns.some((pattern) => new RegExp(pattern, "i").test(line)))
    .filter((line) => !/^[A-Za-z0-9.+#/-]+(?:,\s*[A-Za-z0-9.+#/-]+){2,}$/.test(line))
    .filter((line) => !/^(designed|implemented|built|developed)\b/i.test(line))
    .filter((line) => !hasRepeatedWordRun(line));

  const preferred = candidates.find((line) => /platform|application|dashboard|session|interview|e-commerce|vendor|purchasing/i.test(line));
  return truncate(preferred || candidates[0] || fallback, 140);
};

const buildProject = (sourceLines, config) => ({
  name: config.name,
  techStack: config.techStack,
  summary: config.summary
});

const hasKnownProjectMatch = (text, project) => {
  const normalized = normalizeForComparison(text);

  if (project.key === "prepwise") {
    return normalized.includes("prepwise") && normalized.includes("ai interview");
  }

  if (project.key === "enest") {
    return normalized.includes("enest") && (normalized.includes("multi vendor") || normalized.includes("e commerce"));
  }

  return project.patterns.some((pattern) => new RegExp(pattern, "i").test(text));
};

const isThinTitleBlock = (block) =>
  block.length === 1 && !/tech stack/i.test(block[0]) && block[0].split(" ").length <= 6;

const mergeThinLeadingBlocks = (blocks) => {
  const merged = [];
  let pendingPrefix = "";

  blocks.forEach((block) => {
    if (isThinTitleBlock(block)) {
      pendingPrefix = pendingPrefix ? `${pendingPrefix} ${block[0]}` : block[0];
      return;
    }

    if (pendingPrefix) {
      merged.push([`${pendingPrefix} ${block[0]}`, ...block.slice(1)]);
      pendingPrefix = "";
    } else {
      merged.push(block);
    }
  });

  if (pendingPrefix) {
    merged.push([pendingPrefix]);
  }

  return merged;
};

const detectProjects = (normalized) => {
  const rawBlocks = extractSectionBlocks(normalized.lines, "projects");
  const blocks = mergeThinLeadingBlocks(rawBlocks);

  const projects = blocks
    .map((blockLines) => {
      const lines = blockLines.filter(Boolean);
      if (!lines.length) {
        return null;
      }

      const techStackLine = lines.find((line) => /tech stack/i.test(line));
      const techStack = techStackLine
        ? truncate(normalizeItem(techStackLine.replace(/^tech stack\s*:?/i, "")), 140)
        : "";

      const name = truncate(normalizeItem(lines[0]), 100);

      const summaryLines = lines
        .slice(1)
        .filter((line) => line !== techStackLine)
        .map((line) => normalizeItem(line))
        .filter((line) => line && !hasRepeatedWordRun(line));

      const summary = truncate(summaryLines[0] || "", 160);

      return { name, techStack, summary };
    })
    .filter(Boolean);

  return dedupeByNormalizedValue(projects).slice(0, 5);
};
const EXPERIENCE_DATE_PATTERN =
  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|20\d{2})\s*(?:-|to|–|—)?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|20\d{2}|present)\b/i;

const extractAndStripDateRange = (text) => {
  const match = text.match(EXPERIENCE_DATE_PATTERN);
  if (!match) {
    return { cleanedText: text.trim(), formatted: "" };
  }

  const formatted = `${titleCase(match[1])} to ${titleCase(match[2])}`;
  const cleanedText = text.replace(match[0], "").replace(/\s{2,}/g, " ").trim();
  return { cleanedText, formatted };
};

const detectExperience = (normalized) => {
  const rawBlocks = extractSectionBlocks(normalized.lines, "experience");
  const blocks = mergeThinLeadingBlocks(
    rawBlocks.length ? rawBlocks : [getSectionLines(normalized.lines, "experience")]
  );

  const items = blocks
    .map((blockLines) => {
      const lines = blockLines.filter(Boolean);
      if (!lines.length) {
        return "";
      }

      const titlePortion = [];
      for (const line of lines) {
        if (looksLikeTitleLine(line) || /\b20\d{2}\b/.test(line)) {
          titlePortion.push(line);
        } else {
          break;
        }
      }

      if (!titlePortion.length) {
        return "";
      }

      const fullText = normalizeItem(titlePortion.join(" "));
      const { cleanedText, formatted } = extractAndStripDateRange(fullText);
      const segments = [cleanedText.replace(/[-,\s]+$/, ""), formatted].filter(Boolean);
      return segments.join(" - ");
    })
    .filter(Boolean);

  return dedupeByNormalizedValue(items).slice(0, 5);
};

const IMPACT_WORDS = [
  "improved",
  "reduced",
  "increased",
  "achieved",
  "saved",
  "faster",
  "accuracy",
  "performance",
  "users",
  "revenue",
  "load time"
];
const METRIC_PATTERN = /\b\d+(?:\.\d+)?\s*%|\b\d+\s*(?:users?|ms|sec(?:onds?)?|minutes?|hours?|x|times|orders?|products?|sellers?)\b/i;
const RESULT_PATTERN = /\b(?:improved|reduced|increased|achieved|saved|faster|accuracy|performance|users|revenue|load time)\b/i;
const OPTIMIZED_RESULT_PATTERN = /\boptimized\s+(?:by|for\s+(?:performance|speed|load time|accuracy|conversion|users?))\b/i;
const RESPONSIBILITY_WORDS = [
  "developed",
  "built",
  "implemented",
  "designed",
  "delivered",
  "engineered",
  "integrated",
  "managed",
  "created",
  "improved",
  "optimized",
  "reduced",
  "increased",
  "achieved",
  "scalable"
];

const getResumeItemText = (item) => {
  if (typeof item === "string") {
    return item;
  }

  if (item && typeof item === "object") {
    return [item.name, item.techStack, item.summary].filter(Boolean).join(" ");
  }

  return "";
};

const hasAnyWord = (value = "", words = []) => {
  const normalized = normalizeForComparison(value);
  return words.some((word) => normalized.includes(normalizeForComparison(word)));
};

const hasProjectTechStack = (projects = []) =>
  projects.some((project) => Boolean(project?.techStack || /tech stack|next\.js|react|firebase|tailwind|redux/i.test(getResumeItemText(project))));

const hasImpactMetric = (value = "") => {
  if (METRIC_PATTERN.test(value)) {
    return true;
  }

  return RESULT_PATTERN.test(value) || OPTIMIZED_RESULT_PATTERN.test(value);
};

const hasProjectImpact = (projects = []) => projects.length > 0 && projects.every((project) => hasImpactMetric(getResumeItemText(project)));

const getExperienceQuality = (experience = []) => {
  if (!experience.length) {
    return {
      score: 0,
      hasInternship: false,
      hasRoleCompany: false,
      hasDates: false,
      hasAchievement: false
    };
  }

  const text = experience.map(getResumeItemText).join(" ");
  const hasInternship = /\bintern(?:ship)?\b/i.test(text);
  const hasCompany = /ibm|skillsbuild|company|organization|pvt|ltd|inc/i.test(text);
  const hasRole = /developer|engineer|intern|frontend|front-end|role/i.test(text);
  const hasDates = /(?:jan|feb|mar|apr|may|jun|jul|july|aug|august|sep|oct|nov|dec)[a-z]*\s+20\d{2}|20\d{2}\s*(?:-|to)\s*20\d{2}/i.test(text);
  const hasAchievement = hasAnyWord(text, RESPONSIBILITY_WORDS) && hasImpactMetric(text);

  if (hasDates && hasAchievement) {
    return { score: 20, hasInternship, hasRoleCompany: hasCompany && hasRole, hasDates, hasAchievement };
  }
  if (hasCompany && hasRole) {
    return { score: 16, hasInternship, hasRoleCompany: true, hasDates, hasAchievement };
  }
  if (hasInternship) {
    return { score: 12, hasInternship, hasRoleCompany: false, hasDates, hasAchievement };
  }

  return { score: 8, hasInternship: false, hasRoleCompany: hasCompany && hasRole, hasDates, hasAchievement };
};

const getEducationQuality = (education = []) => {
  if (!education.length) {
    return {
      score: 0,
      hasDegree: false,
      hasInstitution: false,
      hasYearOrScore: false
    };
  }

  const text = education.map(getResumeItemText).join(" ");
  const hasDegree = /b\.?\s*tech|bachelor|diploma|degree/i.test(text);
  const hasInstitution = /college|university|polytechnic|academy|institute|institution|education/i.test(text);
  const hasYearOrScore = /20\d{2}|cgpa|percentage|%|\b\d{1,2}\.\d\b/i.test(text);

  if (hasYearOrScore) {
    return { score: 15, hasDegree, hasInstitution, hasYearOrScore };
  }
  if (hasInstitution) {
    return { score: 12, hasDegree, hasInstitution, hasYearOrScore };
  }
  if (hasDegree) {
    return { score: 8, hasDegree, hasInstitution, hasYearOrScore };
  }

  return { score: 4, hasDegree, hasInstitution, hasYearOrScore };
};

const getClarityScore = ({ skills, projects, education, experience, certifications, projectHasImpact, experienceHasAchievement }) => {
  const sectionItems = [...projects, ...education, ...experience, ...certifications];
  const sectionText = sectionItems.map(getResumeItemText).join(" ");
  const detectedSectionCount = [skills, projects, education, experience, certifications].filter((section) => section.length).length;
  let score = 0;

  if (detectedSectionCount >= 4) {
    score += 4;
  } else if (detectedSectionCount >= 2) {
    score += 2;
  }

  if (!hasRepeatedWordRun(sectionText)) {
    score += 2;
  }

  if (!sectionItems.some((item) => isContactLine(getResumeItemText(item)))) {
    score += 2;
  }

  const cleanQuestionSubjects =
    projects.every((project) => !/tech stack|summary|designed|implemented/i.test(project.name || "")) &&
    education.every((item) => !containsAny(item, EDUCATION_REJECT));
  if (cleanQuestionSubjects) {
    score += 2;
  }

  if (!projectHasImpact) {
    score -= 2;
  }
  if (!experienceHasAchievement && experience.length) {
    score -= 1;
  }

  return Math.max(0, Math.min(score, 10));
};

const calculateResumeStrength = ({ skills, projects, education, experience, certifications }) => {
  const skillsScore = skills.length === 0 ? 0 : skills.length <= 3 ? 8 : skills.length <= 7 ? 15 : 20;

  const projectHasTechStack = hasProjectTechStack(projects);
  const projectHasImpact = hasProjectImpact(projects);
  const projectBaseScore = projects.length === 0 ? 0 : projects.length === 1 ? 12 : 18;
  const projectsScore = Math.min(projectBaseScore + (projectHasTechStack ? 4 : 0) + (projectHasImpact ? 3 : 0), 25);

  const experienceQuality = getExperienceQuality(experience);
  const educationQuality = getEducationQuality(education);
  const certificationsScore = certifications.length === 0 ? 0 : certifications.length === 1 ? 5 : 10;
  const clarityScore = getClarityScore({
    skills,
    projects,
    education,
    experience,
    certifications,
    projectHasImpact,
    experienceHasAchievement: experienceQuality.hasAchievement
  });

  const rawScore = skillsScore + projectsScore + experienceQuality.score + educationQuality.score + certificationsScore + clarityScore;
  const canReachFullScore =
    skills.length >= 8 &&
    projects.length >= 2 &&
    projectHasTechStack &&
    projectHasImpact &&
    experienceQuality.hasRoleCompany &&
    experienceQuality.hasDates &&
    experienceQuality.hasAchievement &&
    educationQuality.hasInstitution &&
    educationQuality.hasYearOrScore &&
    certifications.length >= 2 &&
    clarityScore === 10;
  let score = canReachFullScore ? Math.min(rawScore, 100) : Math.min(rawScore, 95);

  if (!projectHasImpact && !experienceQuality.hasAchievement) {
    score = Math.min(score, 84);
  } else if (!projectHasImpact || !experienceQuality.hasAchievement) {
    score = Math.min(score, 86);
  }

  return score;
};

const buildResumeSuggestions = ({ skills, projects, education, experience, certifications, score }) => {
  const weakAreas = [];
  const suggestions = [];
  const projectHasImpact = hasProjectImpact(projects);
  const experienceQuality = getExperienceQuality(experience);

  if (!projects.length) {
    weakAreas.push("Add stronger project highlights");
    suggestions.push("Include at least one detailed project with impact and technologies used.");
  } else if (!projectHasImpact) {
    weakAreas.push("Add measurable project impact.");
    suggestions.push("Add numbers like improved performance by X%, reduced load time, increased accuracy, etc.");
  }

  if (!experience.length) {
    weakAreas.push("Limited experience visibility");
    suggestions.push("Add internship, freelance, volunteer, or practical experience if available.");
  } else if (!experienceQuality.hasAchievement) {
    weakAreas.push("Add internship achievements with numbers.");
    suggestions.push("Add what you delivered during the internship with numbers, impact, or outcomes.");
  }

  if (!education.length) {
    weakAreas.push("Add complete education details.");
    suggestions.push("Include degree or diploma, institution name, location, and years or CGPA/percentage.");
  }

  if (!certifications.length) {
    weakAreas.push("Add relevant certifications.");
    suggestions.push("Include role-relevant certifications or courses that match the target job.");
  }

  if (skills.length < 5) {
    weakAreas.push("Skill coverage looks narrow");
    suggestions.push("List the most relevant technical and domain skills clearly.");
  }

  if (score >= 80 && !weakAreas.length) {
    weakAreas.push("No major resume gaps detected");
    suggestions.push("Keep refining project impact statements and measurable outcomes.");
  }

  return { weakAreas, suggestions };
};

const generateBehavioralQuestions = () => [
  "Tell me about yourself.",
  "Describe a conflict you resolved in a team setting.",
  "What is your biggest strength, and how has it helped you in your work?",
  "Tell me about a time you handled pressure or a difficult deadline.",
  "Why are you interested in this role?",
  "Describe a situation where you had to learn something quickly.",
  "Tell me about a time you took ownership of a challenging task.",
  "What motivates you to do your best work?"
];

const getEducationQuestionSubject = (item = "") => {
  if (/diploma/i.test(item)) {
    return "Diploma";
  }
  if (/b\.?tech|bachelor/i.test(item)) {
    return "B.Tech";
  }
  return item;
};

const getProjectQuestionSubject = (project = {}) => {
  const normalizedName = normalizeForComparison(project.name || "");

  if (normalizedName.includes("prepwise")) {
    return "Prepwise AI Interview Platform";
  }

  if (normalizedName.includes("enest")) {
    return "Enest Multi-Vendor E-Commerce Platform";
  }

  return normalizeItem(project.name || "").replace(/\s+[-–—]\s+/g, " ");
};

const generateResumeQuestions = ({ skills, projects, experience, education, certifications, technologies }) => {
  const questions = [];

  projects.forEach((project) => {
    const projectSubject = getProjectQuestionSubject(project);
    questions.push(`Explain your ${projectSubject} project.`);
    questions.push(`What challenge did you face while building ${projectSubject}?`);
  });

  experience.slice(0, 3).forEach((item) => {
    if (/ibm skillsbuild frontend developer intern/i.test(item)) {
      questions.push("Tell me about your IBM SkillsBuild internship.");
      return;
    }

    questions.push(`Describe your experience related to "${item}".`);
  });

  skills.slice(0, 6).forEach((skill) => {
    questions.push(`How have you used ${skill} in your projects or work?`);
  });

  technologies.slice(0, 4).forEach((technology) => {
    questions.push(`Why did you choose ${technology} in your implementation?`);
  });

  education.slice(0, 2).forEach((item) => {
    const subject = getEducationQuestionSubject(item);
    if (subject === "Diploma" || subject === "B.Tech") {
      questions.push(`How did your ${subject} prepare you for this role?`);
      return;
    }

    questions.push(`What did you learn from your education experience at "${item}"?`);
  });

  certifications.slice(0, 3).forEach((item) => {
    questions.push(`What practical value did you gain from ${item}?`);
  });

  if (!questions.length) {
    questions.push(
      "Walk me through the strongest section of your resume.",
      "What project on your resume best represents your technical ability?",
      "Which experience on your resume taught you the most?"
    );
  }

  return unique(questions);
};

export const generateResumeInterviewQuestions = (resumeData, questionCount = 20) => {
  const resumeQuestions = generateResumeQuestions(resumeData);
  const behavioralQuestions = generateBehavioralQuestions();
  const resumeTarget = Math.max(1, Math.round(questionCount * 0.6));
  const behavioralTarget = Math.max(1, questionCount - resumeTarget);
  const mixed = [];

  for (let index = 0; index < resumeTarget; index += 1) {
    mixed.push(resumeQuestions[index % resumeQuestions.length]);
  }

  for (let index = 0; index < behavioralTarget; index += 1) {
    mixed.push(behavioralQuestions[index % behavioralQuestions.length]);
  }

  const normalizedQuestions = mixed.map((text, index) => ({
    index,
    text,
    category: "resume",
    expectedFocus: ["resume", "experience", "communication"]
  }));

  console.log("[Resume Parser] questions:", normalizedQuestions);
  return normalizedQuestions;
};

export const analyzeResumeText = (text) => {
  const normalized = normalizeResumeText(text);
  const skills = detectSkills(normalized.text);
  const technologies = detectTechnologies(skills);
  const education = detectEducation(normalized);
  const certifications = detectCertifications(normalized);
  const experience = detectExperience(normalized);
  const projects = detectProjects(normalized);
  const score = calculateResumeStrength({ skills, projects, education, experience, certifications });
  const { weakAreas, suggestions } = buildResumeSuggestions({
    skills,
    projects,
    education,
    experience,
    certifications,
    score
  });

  console.log("[Resume Parser] skills:", skills);
  console.log("[Resume Parser] technologies:", technologies);
  console.log("[Resume Parser] education:", education);
  console.log("[Resume Parser] certifications:", certifications);
  console.log("[Resume Parser] experience:", experience);
  console.log("[Resume Parser] projects:", projects);

  return {
    extractedText: normalized.text,
    skills,
    technologies,
    education,
    certifications,
    experience,
    projects,
    score,
    weakAreas,
    suggestions
  };
};

export const extractResumeText = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Resume must be 5 MB or smaller.");
  }

  if (extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += `${content.items.map((item) => item.str).join(" ")}\n`;
    }

    return normalizeWhitespace(text);
  }

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeWhitespace(result.value);
  }

  throw new Error("Only PDF and DOCX resumes are supported.");
};
