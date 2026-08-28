import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import matter from "gray-matter";
import type { Heading, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { isISODate, todayISO } from "@/lib/dates";
import { normalizeFrontmatter, PeopleDataError, validatePeopleCollection } from "@/lib/people";
import type {
  Interaction,
  ISODate,
  PeopleDataset,
  Person,
  PersonSections,
} from "@/types/person";

const INTERACTION_HEADING = /^(\d{4}-\d{2}-\d{2})\s+[—-]\s+(.+)$/;
const FOLLOW_UP_HEADING = /^follow[ -]?up$/i;
const RAW_LAST_CONTACT = /^[ \t]*last_contact[ \t]*:[ \t]*([^#\s]+)[ \t]*(?:#[^\r\n]*)?$/m;
const GRAY_MATTER_YAML_ENGINE = (matter as typeof matter & {
  engines: { yaml: { parse: (input: string) => object } };
}).engines.yaml;

interface ParsePersonOptions {
  absolutePath: string;
  relativePath: string;
  currentDate?: ISODate;
}

export interface ExtractedMarkdownSections {
  interactions: Interaction[];
  sections: PersonSections;
}

function isHeading(node: RootContent, depth: 2 | 3): node is Heading {
  return node.type === "heading" && node.depth === depth;
}

function originalMarkdown(source: string, nodes: RootContent[]): string {
  if (nodes.length === 0) return "";
  const start = nodes[0].position?.start.offset;
  const end = nodes.at(-1)?.position?.end.offset;
  if (start === undefined || end === undefined) {
    throw new PeopleDataError("Unable to read Markdown section", {
      issues: ["Markdown parser did not return source offsets."],
    });
  }
  return source.slice(start, end).trim();
}

function sectionEnd(children: RootContent[], start: number): number {
  const nextHeading = children.findIndex((node, index) => index > start && isHeading(node, 2));
  return nextHeading === -1 ? children.length : nextHeading;
}

function blockEnd(nodes: RootContent[], start: number): number {
  const nextHeading = nodes.findIndex((node, index) => index > start && isHeading(node, 3));
  return nextHeading === -1 ? nodes.length : nextHeading;
}

function followUpBlockEnd(nodes: RootContent[], start: number): number {
  const nextHeading = nodes.findIndex((node, index) => (
    index > start && node.type === "heading" && node.depth <= 3
  ));
  return nextHeading === -1 ? nodes.length : nextHeading;
}

function interactionsAndFollowUp(source: string, nodes: RootContent[]): {
  interactions: Interaction[];
  followUp: string;
} {
  const extracted: Array<{ interaction: Interaction; sourceIndex: number }> = [];
  const followUps: string[] = [];

  nodes.forEach((node, sourceIndex) => {
    if (!isHeading(node, 3)) return;

    const heading = toString(node).trim();

    if (FOLLOW_UP_HEADING.test(heading)) {
      const body = nodes.slice(sourceIndex + 1, followUpBlockEnd(nodes, sourceIndex));
      const followUp = originalMarkdown(source, body);
      if (followUp) followUps.push(followUp);
      return;
    }

    const match = INTERACTION_HEADING.exec(heading);
    if (!match) return;

    const [, date, kind] = match;
    if (!isISODate(date)) {
      throw new PeopleDataError("Invalid interaction heading", {
        issues: [`${date} is not a valid calendar date.`],
      });
    }

    extracted.push({
      interaction: {
        date,
        kind: kind.trim(),
        markdown: originalMarkdown(source, nodes.slice(sourceIndex + 1, blockEnd(nodes, sourceIndex))),
      },
      sourceIndex,
    });
  });

  extracted.sort((left, right) => (
    right.interaction.date.localeCompare(left.interaction.date)
    || left.sourceIndex - right.sourceIndex
  ));

  return {
    interactions: extracted.map(({ interaction }) => interaction),
    followUp: followUps.join("\n\n"),
  };
}

export function extractMarkdownSections(markdown: string): ExtractedMarkdownSections {
  const root = unified().use(remarkParse).parse(markdown);
  const children = root.children;
  const sections: PersonSections = { whyTheyMatter: "", context: "", followUp: "" };
  let interactions: Interaction[] = [];

  children.forEach((node, index) => {
    if (!isHeading(node, 2)) return;

    const heading = toString(node).trim().toLowerCase();
    const nodes = children.slice(index + 1, sectionEnd(children, index));
    if (heading === "why they matter") {
      sections.whyTheyMatter = originalMarkdown(markdown, nodes);
    } else if (heading === "context") {
      sections.context = originalMarkdown(markdown, nodes);
    } else if (heading === "interactions") {
      const extracted = interactionsAndFollowUp(markdown, nodes);
      interactions = extracted.interactions;
      sections.followUp = extracted.followUp;
    }
  });

  return { interactions, sections };
}

function withSourcePath(error: PeopleDataError, sourceRelativePath: string): PeopleDataError {
  if (error.sourceRelativePath) return error;
  return new PeopleDataError("Invalid person Markdown", {
    sourceRelativePath,
    issues: error.issues,
  });
}

function validateRawLastContact(frontmatter: string, sourceRelativePath: string): void {
  const match = RAW_LAST_CONTACT.exec(frontmatter);
  if (!match) return;

  const rawValue = match[1].replace(/^(['"])(.*)\1$/, "$2");
  if (!isISODate(rawValue)) {
    throw new PeopleDataError("Invalid person frontmatter", {
      sourceRelativePath,
      issues: ["last_contact: must be a real calendar date"],
    });
  }
}

export function parsePersonMarkdown(source: string, options: ParsePersonOptions): Person {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(source, {
      engines: {
        yaml: (frontmatter) => {
          validateRawLastContact(frontmatter, options.relativePath);
          return GRAY_MATTER_YAML_ENGINE.parse(frontmatter);
        },
      },
    });
  } catch (error) {
    if (error instanceof PeopleDataError) throw error;
    throw new PeopleDataError("Invalid person frontmatter", {
      sourceRelativePath: options.relativePath,
      issues: ["frontmatter could not be parsed"],
    });
  }

  const frontmatter = normalizeFrontmatter(parsed.data, options.relativePath);
  let extracted: ExtractedMarkdownSections;
  try {
    extracted = extractMarkdownSections(parsed.content);
  } catch (error) {
    if (error instanceof PeopleDataError) throw withSourcePath(error, options.relativePath);
    throw error;
  }

  const newestInteractionDate = extracted.interactions[0]?.date;
  const effectiveLastContact = frontmatter.lastContact ?? newestInteractionDate;
  const currentDate = options.currentDate ?? todayISO();
  if (effectiveLastContact && effectiveLastContact > currentDate) {
    throw new PeopleDataError("Invalid person contact date", {
      sourceRelativePath: options.relativePath,
      issues: [`last contact ${effectiveLastContact} cannot be in the future`],
    });
  }

  const diagnostics: Person["diagnostics"] = [];
  if (frontmatter.lastContact && newestInteractionDate && newestInteractionDate > frontmatter.lastContact) {
    diagnostics.push({
      level: "warning",
      code: "last-contact-mismatch",
      message: `Frontmatter last_contact ${frontmatter.lastContact} is older than interaction ${newestInteractionDate}.`,
      sourceRelativePath: options.relativePath,
    });
  }

  return {
    ...frontmatter,
    effectiveLastContact,
    interactions: extracted.interactions,
    sections: extracted.sections,
    diagnostics,
    sourcePath: options.absolutePath,
    sourceRelativePath: options.relativePath,
  };
}

export async function loadPeopleFromDirectory(
  directory: string,
  currentDate: ISODate,
): Promise<PeopleDataset> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    throw new PeopleDataError("Invalid people data", { issues: ["No Markdown files found."] });
  }

  const people = await Promise.all(entries.map(async (entry) => {
    const absolutePath = resolve(directory, entry.name);
    return parsePersonMarkdown(await readFile(absolutePath, "utf8"), {
      absolutePath,
      relativePath: relative(process.cwd(), absolutePath),
      currentDate,
    });
  }));

  return validatePeopleCollection(people, currentDate);
}
