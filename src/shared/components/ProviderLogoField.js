"use client";

import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@/shared/components";
import { isCustomLogo, readLogoFile } from "@/shared/utils/providerLogo";

const DEFAULT_HINT = "Optional. PNG, JPEG, WebP or GIF, up to 2 MB. Leave it empty to keep the default icon.";

export default function ProviderLogoField({ logo, onChange, hint = DEFAULT_HINT }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const preview = isCustomLogo(logo);
  const isUrl = preview && /^https?:\/\//i.test(preview);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      onChange(await readLogoFile(file));
    } catch (err) {
      setError(err?.message || "Failed to read that image");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) return;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      setError("That doesn't look like a valid URL");
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      setError("Only http:// and https:// URLs are supported");
      return;
    }
    setError("");
    onChange(parsed.href);
    setUrlValue("");
    setUrlMode(false);
  };

  const switchMode = (next) => {
    setUrlMode(next);
    setError("");
    setUrlValue("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-main">Logo</label>

      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <span className="mt-0.5 size-10 shrink-0 rounded-[6px] border border-border/50 bg-surface-2 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="" className="size-full object-contain" loading="lazy" decoding="async" />
          ) : (
            <span className="material-symbols-outlined text-[18px] text-text-muted">image</span>
          )}
        </span>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Mode toggle pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                !urlMode
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Upload file
            </button>
            <span className="text-text-muted/50 text-xs select-none">·</span>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                urlMode
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Paste URL
            </button>
          </div>

          {/* Active input */}
          {!urlMode ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                icon="upload"
                loading={loading}
                onClick={() => fileRef.current?.click()}
                className="w-full sm:w-auto"
              >
                {preview ? "Change Logo" : "Upload Logo"}
              </Button>
              {preview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setError(""); onChange(""); }}
                >
                  Remove
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/logo.png"
                autoFocus
                className="flex-1 min-w-0 text-sm rounded-md border border-border bg-surface-2 px-3 py-1.5 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
              <Button
                type="submit"
                variant="outline"
                icon="check"
                disabled={!urlValue.trim()}
              >
                Use
              </Button>
            </form>
          )}

          {/* Show current URL if logo is a URL (not dataURL) */}
          {isUrl && !urlMode && (
            <p className="text-xs text-text-muted truncate max-w-full" title={preview}>
              <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">link</span>
              {preview}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      <p className={`text-xs ${error ? "text-danger" : "text-text-muted"}`}>
        {error || (urlMode ? "Paste a direct link to the logo image." : hint)}
      </p>
    </div>
  );
}

ProviderLogoField.propTypes = {
  logo: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string,
};
