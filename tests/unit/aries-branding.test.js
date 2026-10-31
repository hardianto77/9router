import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const readme = read("README.md");
const banner = read("public/banner.svg");
const favicon = read("public/favicon.svg");
const logoMark = read("src/shared/components/LogoMark.js");
const claimPage = read("src/app/claim/page.js");

describe("Aries visual identity", () => {
  it("shows the Aries banner in the README", () => {
    expect(readme).toContain('src="./public/banner.svg"');
    expect(banner).toContain('<title id="title">Aries Router</title>');
  });

  it("uses the Aries ram-horn mark in the app and removes the XRouter mark", () => {
    expect(logoMark).toContain("M 32,46 C 32,37 27,29 21,24");
    expect(logoMark).not.toContain("xr-logo-gradient");
    expect(favicon).toContain("M 32,46");
    expect(claimPage).toContain("ARIES ROUTER");
    expect(claimPage).not.toContain("X ROUTER");
  });
});
