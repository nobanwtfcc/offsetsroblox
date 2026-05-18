import type { OffsetRow } from "./offsets.functions";

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

export function toHpp(offsets: OffsetRow[]): string {
  const lines = [
    "// Roblox Internal Offsets",
    `// Generated: ${new Date().toISOString()}`,
    "#pragma once",
    "",
    "namespace Offsets {",
  ];
  const byCat = new Map<string, OffsetRow[]>();
  for (const o of offsets) {
    if (!byCat.has(o.category)) byCat.set(o.category, []);
    byCat.get(o.category)!.push(o);
  }
  for (const [cat, items] of byCat) {
    lines.push(`    // ${cat}`);
    for (const o of items) {
      lines.push(`    constexpr auto ${safeName(o.name)} = ${o.address};`);
    }
    lines.push("");
  }
  lines.push("}");
  return lines.join("\n");
}

export function toJson(offsets: OffsetRow[]): string {
  const out: Record<string, Record<string, string>> = {};
  for (const o of offsets) {
    out[o.category] ??= {};
    out[o.category][o.name] = o.address;
  }
  return JSON.stringify(
    { generated_at: new Date().toISOString(), offsets: out },
    null,
    2,
  );
}