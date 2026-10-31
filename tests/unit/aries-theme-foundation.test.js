import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: getSettingsMock,
  updateSettings: vi.fn(),
}));
vi.mock("@/lib/auth/dashboardSession", () => ({
  getDashboardAuthSession: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { GET } from "@/app/api/theme/route.js";
import useThemeStore from "@/store/themeStore.js";

const designTokens = readFileSync(
  new URL("../../src/shared/styles/aries-design.css", import.meta.url),
  "utf8"
);

describe("Aries theme defaults", () => {
  beforeEach(() => {
    getSettingsMock.mockReset();
    useThemeStore.setState({ theme: "dark", canChangeTheme: false, hydrated: false });
  });

  it("uses solid dark when there is no saved theme", async () => {
    getSettingsMock.mockResolvedValue({});

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: "dark" });
  });

  it("preserves an explicitly saved glass preference", async () => {
    getSettingsMock.mockResolvedValue({ theme: "glass" });

    const response = await GET();

    expect(await response.json()).toEqual({ theme: "glass" });
  });

  it("falls back to solid dark when settings cannot be read", async () => {
    getSettingsMock.mockRejectedValue(new Error("isolated test failure"));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: "dark" });
  });

  it("keeps the client store default dark while honoring explicit glass", () => {
    expect(useThemeStore.getState().theme).toBe("dark");

    useThemeStore.getState().setServerTheme("glass");
    expect(useThemeStore.getState().theme).toBe("glass");

    useThemeStore.getState().setServerTheme(undefined);
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("keeps glass styling responsive and respects reduced transparency", () => {
    expect(designTokens).toContain(".dark.glass");
    expect(designTokens).toContain("@media (max-width: 640px)");
    expect(designTokens).toContain("prefers-reduced-transparency: reduce");
    expect(designTokens).toContain("backdrop-filter: blur(9px) saturate(120%)");
  });
});
