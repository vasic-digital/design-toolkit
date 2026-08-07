// Minimal DTCG (Design Tokens Community Group) structural validator.
// Checks the shape the toolkit emits and OpenDesign consumes (dtcg-tokens.md):
//   - a token is a node with a $value
//   - $type is resolved from the token or its nearest ancestor group
//   - color values are #rgb / #rrggbb / #rrggbbaa hex
//   - dimension values are { value:number, unit:"px"|"rem" }
//   - fontFamily values are string or string[]
// Returns { valid, tokenCount, errors[] } — real pass/fail, no bluff.

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RESERVED = new Set(["$value", "$type", "$description", "$extensions", "$deprecated"]);

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {unknown} doc parsed JSON token document
 * @returns {{ valid: boolean, tokenCount: number, errors: string[] }}
 */
export function validateDtcg(doc) {
  const errors = [];
  let tokenCount = 0;

  if (!isPlainObject(doc)) {
    return { valid: false, tokenCount: 0, errors: ["root is not an object"] };
  }

  const walk = (node, path, inheritedType) => {
    const ownType = typeof node.$type === "string" ? node.$type : inheritedType;

    if ("$value" in node) {
      tokenCount++;
      validateValue(node.$value, ownType, path, errors);
      return; // leaf token — do not descend further
    }

    for (const [key, child] of Object.entries(node)) {
      if (RESERVED.has(key)) continue;
      const childPath = path ? `${path}.${key}` : key;
      if (!isPlainObject(child)) {
        errors.push(`${childPath}: expected group or token object, got ${typeof child}`);
        continue;
      }
      walk(child, childPath, ownType);
    }
  };

  walk(doc, "", undefined);
  return { valid: errors.length === 0, tokenCount, errors };
}

function validateValue(value, type, path, errors) {
  if (type == null) {
    errors.push(`${path}: token has no resolvable $type`);
    return;
  }
  switch (type) {
    case "color":
      if (typeof value === "string" && HEX.test(value)) return;
      if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) return; // alias
      errors.push(`${path}: invalid color value ${JSON.stringify(value)}`);
      return;
    case "dimension":
      if (isPlainObject(value) && typeof value.value === "number" &&
          (value.unit === "px" || value.unit === "rem")) return;
      errors.push(`${path}: invalid dimension value ${JSON.stringify(value)}`);
      return;
    case "fontFamily":
      if (typeof value === "string") return;
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) return;
      errors.push(`${path}: invalid fontFamily value ${JSON.stringify(value)}`);
      return;
    default:
      // Other DTCG types are allowed through structurally (value must exist).
      if (value === undefined) errors.push(`${path}: missing $value`);
      return;
  }
}

/**
 * Extract the { tokenName: hex } color scheme maps from an emitted document.
 * @param {object} doc
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}
 */
export function extractSchemes(doc) {
  const pull = (group) => {
    const out = {};
    for (const [k, v] of Object.entries(group || {})) {
      if (k.startsWith("$")) continue;
      if (isPlainObject(v) && typeof v.$value === "string") out[k] = v.$value;
    }
    return out;
  };
  return { light: pull(doc?.color?.light), dark: pull(doc?.color?.dark) };
}
