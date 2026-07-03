import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url);
const srcDir = new URL("src/", root);
const distDir = new URL("dist/", root);

const tokenFiles = {
  light: "Light.tokens.json",
  dark: "Dark.tokens.json",
};

function isToken(value) {
  return (
    value &&
    typeof value === "object" &&
    Object.hasOwn(value, "$type") &&
    Object.hasOwn(value, "$value")
  );
}

function collectTokens(node, trail = [], output = []) {
  if (isToken(node)) {
    output.push({
      path: trail,
      name: toCssName(trail),
      type: node.$type,
      value: normalizeValue(node),
    });
    return output;
  }

  for (const [key, value] of Object.entries(node ?? {})) {
    if (value && typeof value === "object") {
      collectTokens(value, [...trail, key], output);
    }
  }

  return output;
}

function dedupeTokens(tokens) {
  return [...new Map(tokens.map((token) => [token.name, token])).values()];
}

function normalizeValue(token) {
  if (token.$type === "color") {
    const value = token.$value;
    const alpha = value.alpha ?? 1;

    if (alpha < 1) {
      const [r, g, b] = value.components.map((component) =>
        Math.round(component * 255),
      );
      return `rgba(${r}, ${g}, ${b}, ${trimNumber(alpha)})`;
    }

    return value.hex;
  }

  if (token.$type === "number") {
    return token.$value;
  }

  return String(token.$value);
}

function toCssName(parts) {
  return parts.map(toKebabSegment).join("-");
}

function toKebabSegment(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d+)/g, "$1-$2")
    .replace(/(\d+)([a-zA-Z])/g, "$1-$2")
    .toLowerCase();
}

function trimNumber(value) {
  return Number.parseFloat(Number(value).toFixed(4));
}

function cssValue(token) {
  if (token.type === "number" && isLengthToken(token.path)) {
    return `${trimNumber(token.value)}px`;
  }

  if (token.type === "number" && isFontSizeToken(token.path)) {
    return `${trimNumber(token.value)}px`;
  }

  if (token.type === "number" && isLineHeightToken(token.path)) {
    return `${trimNumber(token.value)}px`;
  }

  if (token.type === "number" && isLetterSpacingToken(token.path)) {
    return `${trimNumber(token.value)}em`;
  }

  if (token.type === "number") {
    return String(trimNumber(token.value));
  }

  if (isFontFamilyToken(token.path)) {
    return quoteFontFamily(token.value);
  }

  return token.value;
}

function isLengthToken(pathParts) {
  return ["Radius", "Spacing"].includes(pathParts[0]);
}

function isFontSizeToken(pathParts) {
  return pathParts[0] === "Font" && pathParts[1] === "font-size";
}

function isLineHeightToken(pathParts) {
  return pathParts[0] === "Font" && pathParts[1] === "line-height";
}

function isLetterSpacingToken(pathParts) {
  return pathParts[0] === "Font" && pathParts[1] === "letter-spacing";
}

function isFontFamilyToken(pathParts) {
  return pathParts[0] === "Font" && pathParts[1].startsWith("font-family");
}

function quoteFontFamily(value) {
  const family = String(value);
  return family.includes(" ") ? `"${family}"` : family;
}

function buildCss(tokensByMode) {
  const light = tokensByMode.light
    .map((token) => `  --${token.name}: ${cssValue(token)};`)
    .join("\n");
  const dark = tokensByMode.dark
    .map((token) => `  --${token.name}: ${cssValue(token)};`)
    .join("\n");

  return `:root {\n${light}\n}\n\n.dark {\n${dark}\n}\n`;
}

function buildNestedMap(tokens, section) {
  const result = {};

  for (const token of tokens) {
    if (token.path[0] !== section) continue;

    const parts = token.path.slice(1).map(toObjectKey);
    let cursor = result;

    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1) {
        cursor[part] = `var(--${token.name})`;
      } else {
        cursor[part] ??= {};
        cursor = cursor[part];
      }
    }
  }

  return result;
}

function toObjectKey(value) {
  return toKebabSegment(value).replace(/-([a-z])/g, (_, letter) =>
    letter.toUpperCase(),
  );
}

function jsObject(value) {
  return JSON.stringify(value, null, 2);
}

async function main() {
  await mkdir(new URL("css/", distDir), { recursive: true });
  await mkdir(new URL("json/", distDir), { recursive: true });
  await mkdir(new URL("tailwind/", distDir), { recursive: true });

  const tokensByMode = {};

  for (const [mode, file] of Object.entries(tokenFiles)) {
    const source = JSON.parse(await readFile(new URL(file, srcDir), "utf8"));
    tokensByMode[mode] = dedupeTokens(collectTokens(source));
    await writeFile(
      new URL(`json/${mode}.json`, distDir),
      `${JSON.stringify(tokensByMode[mode], null, 2)}\n`,
    );
  }

  const css = buildCss(tokensByMode);
  await writeFile(new URL("css/variables.css", distDir), css);

  const light = tokensByMode.light;
  const tailwind = {
    colors: buildNestedMap(light, "Color"),
    spacing: buildNestedMap(light, "Spacing"),
    borderRadius: buildNestedMap(light, "Radius"),
    fontFamily: buildNestedMap(light, "Font").fontFamily,
    fontSize: buildNestedMap(light, "Font").fontSize,
    fontWeight: buildNestedMap(light, "Font").fontWeight,
    lineHeight: buildNestedMap(light, "Font").lineHeight,
    letterSpacing: buildNestedMap(light, "Font").letterSpacing,
  };

  await writeFile(
    new URL("tailwind/tokens.mjs", distDir),
    `export const tokens = ${jsObject(tailwind)};\n`,
  );
  await writeFile(
    new URL("tailwind/tokens.d.ts", distDir),
    `type TokenMap = Record<string, string | TokenMap>;\nexport declare const tokens: {\n  colors: TokenMap;\n  spacing: Record<string, string>;\n  borderRadius: Record<string, string>;\n  fontFamily: Record<string, string>;\n  fontSize: Record<string, string>;\n  fontWeight: Record<string, string>;\n  lineHeight: Record<string, string>;\n  letterSpacing: Record<string, string>;\n};\n`,
  );
  await writeFile(
    new URL("index.mjs", distDir),
    `export const lightTokens = ${jsObject(tokensByMode.light)};\nexport const darkTokens = ${jsObject(tokensByMode.dark)};\n`,
  );
  await writeFile(
    new URL("index.d.ts", distDir),
    "export declare const lightTokens: readonly unknown[];\nexport declare const darkTokens: readonly unknown[];\n",
  );

  console.log(
    `Built ${tokensByMode.light.length} light tokens and ${tokensByMode.dark.length} dark tokens into ${path.relative(process.cwd(), distDir.pathname)}`,
  );
}

await main();
