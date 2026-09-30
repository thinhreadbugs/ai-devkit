import * as path from "path";
import { LintCheckResult, LintDependencies } from "../types.js";
import { createMissingCheck, createOkCheck } from "./check-factories.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveFeatureDocPath(
  cwd: string,
  docsDir: string,
  phase: string,
  normalizedName: string,
  deps: LintDependencies,
): string | null {
  const legacyPath = `${docsDir}/${phase}/feature-${normalizedName}.md`;

  const datePrefixedPattern = new RegExp(
    `^\\d{4}-\\d{2}-\\d{2}-feature-${escapeRegex(normalizedName)}\\.md$`,
  );

  // md/ is the current layout; the phase dir itself holds docs created before the split.
  for (const subDir of ["md", ""]) {
    const relDir = subDir ? `${docsDir}/${phase}/${subDir}` : `${docsDir}/${phase}`;
    if (!deps.readdirSync) {
      break;
    }
    try {
      const newestFile = deps
        .readdirSync(path.join(cwd, relDir))
        .filter((file) => datePrefixedPattern.test(file))
        .sort()
        .reverse()[0];
      if (newestFile) {
        return `${relDir}/${newestFile}`;
      }
    } catch {
      // Directory missing; try the next layout.
    }
  }

  if (deps.existsSync(path.join(cwd, legacyPath))) {
    return legacyPath;
  }

  return null;
}

export function runFeatureDocsRules(
  cwd: string,
  docsDir: string,
  phases: readonly string[],
  normalizedName: string,
  deps: LintDependencies,
): LintCheckResult[] {
  return phases.map((phase) => {
    const id = `feature-doc-${phase}`;
    const resolvedPath = resolveFeatureDocPath(cwd, docsDir, phase, normalizedName, deps);

    if (resolvedPath) {
      return createOkCheck(id, "feature-docs", resolvedPath);
    }

    return createMissingCheck(
      id,
      "feature-docs",
      `${docsDir}/${phase}/md/YYYY-MM-DD-feature-${normalizedName}.md`,
      `Create ${docsDir}/${phase}/md/YYYY-MM-DD-feature-${normalizedName}.md`,
    );
  });
}
