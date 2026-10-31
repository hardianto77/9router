"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "@/shared/components";

/**
 * ADCode Authentication Modal
 * Allows users to:
 * 1. Log in with existing email/password
 * 2. Register a new email/password account
 * 3. Import existing Firebase refresh token
 */
export default function AdcodeAuthModal({ isOpen, providerInfo, onSuccess, onClose }) {
  const [tab, setTab] = useState("login"); // "login" | "register" | "token"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const reset = () => {
    setEmail("");
    setPassword("");
    setToken("");
    setError(null);
    setLoading(false);
    setSuccessInfo(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (action) => {
    setError(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      let payload = { action };
      if (action === "login" || action === "register") {
        if (!email.trim() || !password.trim()) {
          throw new Error("Email and password are required.");
        }
        if (action === "register" && password.trim().length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        payload.email = email.trim();
        payload.password = password.trim();
      } else if (action === "token") {
        if (!token.trim()) {
          throw new Error("Enter an ADCode refresh token or idToken.");
        }
        payload.token = token.trim();
      }

      const res = await fetch("/api/oauth/adcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ADCode authentication failed.");
      }

      if (data.message) {
        setSuccessInfo({
          title: "Registration successful!",
          message: data.message,
          note: "Check your inbox or spam folder for the ADCode verification link to activate your account.",
        });
      }

      onSuccess?.();
      if (!data.message) {
        handleClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Connect ADCode Tagflow"
      onClose={handleClose}
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-lg bg-surface-raised/70 p-1 border border-border/40 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
              tab === "login"
                ? "bg-primary text-white shadow-sm font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(null); }}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
              tab === "register"
                ? "bg-primary text-white shadow-sm font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setTab("token"); setError(null); }}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
              tab === "token"
                ? "bg-primary text-white shadow-sm font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            Token
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Info */}
        {successInfo && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex flex-col gap-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {successInfo.title || "Connected to ADCode!"}
            </div>
            {successInfo.message && (
              <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                {successInfo.message}
              </p>
            )}
            {successInfo.note && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {successInfo.note}
              </div>
            )}
            <Button
              className="mt-2 w-full"
              size="sm"
              onClick={handleClose}
            >
              Done & Close
            </Button>
          </div>
        )}

        {!successInfo && (
          <>
            {/* Tab 1: Login */}
            {tab === "login" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("login");
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Sign in with your verified ADCode email and password.
                </p>
                <Input
                  label="Email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="ADCode account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading} disabled={loading}>
                    Sign In & Connect
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 2: Register */}
            {tab === "register" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("register");
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Register a new email with the ADCode Firebase backend. An email verification link will be sent automatically to your inbox or spam folder.
                </p>
                <Input
                  label="New Email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <Input
                  label="Password (min. 6 characters)"
                  type="password"
                  placeholder="Create a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading} disabled={loading}>
                    Create Account & Connect
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 3: Token Import */}
            {tab === "token" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("token");
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Have a refreshToken or idToken from the ADCode desktop app? Enter it here.
                </p>
                <Input
                  label="Firebase Refresh Token / ID Token"
                  type="textarea"
                  placeholder="AMf-vBx..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading} disabled={loading}>
                    Import Token
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

AdcodeAuthModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  providerInfo: PropTypes.object,
  onSuccess: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};
