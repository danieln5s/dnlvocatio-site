import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhotoAccess } from "@/context/photoAccessContext";

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Step = "email" | "code";

/** Keeps provider wording out of the UI and avoids leaking account existence. */
const friendlyError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.toLowerCase();

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (message.includes("expired") || message.includes("invalid") || message.includes("token")) {
    return "That code is not valid, or it has expired or already been used. Request a new one.";
  }
  if (message.includes("not configured")) {
    return "Photo access is not set up on this site yet.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "Could not reach the verification service. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
};

const PhotoAccessDialog = () => {
  const { status, isDialogOpen, closeDialog, requestCode, verifyCode } = usePhotoAccess();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setStep("email");
    setCode("");
    setBusy(false);
    setError(null);
    setNotice(null);
    setCooldown(0);
  }, []);

  // Close as soon as a session exists, whichever step we were on.
  useEffect(() => {
    if (status === "verified" && isDialogOpen) {
      reset();
      closeDialog();
    }
  }, [status, isDialogOpen, closeDialog, reset]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const send = useCallback(
    async (target: string, { resent }: { resent: boolean }) => {
      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        await requestCode(target);
        setStep("code");
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setNotice(
          resent
            ? `A new code is on its way to ${target}.`
            : `We sent a 6-digit code to ${target}. It expires in 10 minutes.`,
        );
      } catch (cause) {
        setError(friendlyError(cause));
      } finally {
        setBusy(false);
      }
    },
    [requestCode],
  );

  const onSubmitEmail = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const target = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(target)) {
      setError("Enter a valid email address.");
      return;
    }

    await send(target, { resent: false });
  };

  const onSubmitCode = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const value = code.trim();

    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await verifyCode(email.trim().toLowerCase(), value);
      // The provider closes the dialog once the session lands.
    } catch (cause) {
      setError(friendlyError(cause));
      setCode("");
      codeInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      closeDialog();
    }
  };

  const cancel = () => {
    reset();
    closeDialog();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View the pictures</DialogTitle>
          <DialogDescription>
            Photographs on this site are only served to verified email addresses. Enter your email,
            and we will send you a one-time code.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Requests for each photograph are recorded against your verified email address so I can see
          who has asked to view them.
        </p>

        {step === "email" ? (
          <form onSubmit={onSubmitEmail} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="photo-access-email">Email address</Label>
              <Input
                id="photo-access-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                aria-describedby={error ? "photo-access-error" : undefined}
                aria-invalid={error ? true : undefined}
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={cancel} disabled={busy}>
                Continue without pictures
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={onSubmitCode} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="photo-access-code">6-digit code</Label>
              <Input
                id="photo-access-code"
                ref={codeInputRef}
                name="one-time-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(changeEvent) =>
                  setCode(changeEvent.target.value.replace(/\D/g, "").slice(0, 6))
                }
                aria-describedby={error ? "photo-access-error" : "photo-access-notice"}
                aria-invalid={error ? true : undefined}
                placeholder="123456"
                className="tracking-[0.5em] text-center text-lg"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Sent to <span className="text-foreground">{email.trim().toLowerCase()}</span>. Codes
                expire and can only be used once.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                className="text-accent underline underline-offset-4 hover:no-underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                onClick={() => send(email.trim().toLowerCase(), { resent: true })}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                className="text-accent underline underline-offset-4 hover:no-underline"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setNotice(null);
                }}
                disabled={busy}
              >
                Use a different email
              </button>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={cancel} disabled={busy}>
                Continue without pictures
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Verifying…" : "Verify and view"}
              </Button>
            </DialogFooter>
          </form>
        )}

        <p id="photo-access-notice" role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {notice}
        </p>

        {error ? (
          <p id="photo-access-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PhotoAccessDialog;
