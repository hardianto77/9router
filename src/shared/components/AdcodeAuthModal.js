"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "@/shared/components";

/**
 * ADCode Authentication Modal
 * Allows users to:
 * 1. Log in with existing email/password
 * 2. Register a new email/password account
 * 3. 1-Click instant auto account generation
 * 4. Import existing Firebase refresh token
 */
export default function AdcodeAuthModal({ isOpen, providerInfo, onSuccess, onClose }) {
  const [tab, setTab] = useState("login"); // "login" | "register" | "quick" | "token"
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
          throw new Error("Email dan password wajib diisi.");
        }
        if (action === "register" && password.trim().length < 6) {
          throw new Error("Password minimal 6 karakter.");
        }
        payload.email = email.trim();
        payload.password = password.trim();
      } else if (action === "token") {
        if (!token.trim()) {
          throw new Error("Masukkan refresh token atau idToken ADCode.");
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
        throw new Error(data.error || "Gagal melakukan otentikasi ADCode.");
      }

      if (data.generatedCredentials) {
        setSuccessInfo({
          email: data.generatedCredentials.email,
          password: data.generatedCredentials.password,
        });
      }

      onSuccess?.();
      if (!data.generatedCredentials) {
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
            Daftar Akun
          </button>
          <button
            type="button"
            onClick={() => { setTab("quick"); setError(null); }}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
              tab === "quick"
                ? "bg-primary text-white shadow-sm font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            ⚡ 1-Klik Instan
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

        {/* Success Info (for 1-click generated credentials) */}
        {successInfo && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex flex-col gap-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Akun ADCode Berhasil Dibuat & Terkoneksi!
            </div>
            <div className="bg-surface/80 p-2 rounded border border-border/50 font-mono text-[11px] text-foreground space-y-0.5 select-all">
              <div>Email: {successInfo.email}</div>
              <div>Password: {successInfo.password}</div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Akun ini sudah otomatis aktif di X Router dan memiliki kuota 2.000 session credits.
            </div>
            <Button
              className="mt-2 w-full"
              size="sm"
              onClick={handleClose}
            >
              Selesai & Tutup
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
                  Login menggunakan akun ADCode yang sudah terdaftar.
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
                  placeholder="Password akun ADCode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Batal
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
                  Daftarkan email Anda langsung ke backend ADCode (Firebase). Akun baru otomatis mendapatkan kuota 2.000 session credits.
                </p>
                <Input
                  label="Email Baru"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <Input
                  label="Password (min. 6 karakter)"
                  type="password"
                  placeholder="Buat password baru"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Batal
                  </Button>
                  <Button type="submit" loading={loading} disabled={loading}>
                    Daftar & Connect
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 3: 1-Click Instant */}
            {tab === "quick" && (
              <div className="flex flex-col gap-3 py-1">
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                  <div className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">bolt</span>
                    Buat Akun Instan Otomatis
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Sistem akan secara instan membuatkan akun Firebase ADCode baru, mengambil refreshToken, dan langsung menyimpannya ke connection pool X Router tanpa perlu repot mengisi form.
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit("quick")}
                    loading={loading}
                    disabled={loading}
                  >
                    🚀 Buat Akun & Connect
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 4: Token Import */}
            {tab === "token" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("token");
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Punya refreshToken atau idToken dari aplikasi desktop ADCode? Masukkan langsung di sini.
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
                    Batal
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
