import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  isPhotoAccessConfigured: true,
  functionsUrl: () => "https://project.supabase.co/functions/v1",
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithOtp: mocks.signInWithOtp,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
    },
  },
}));

import PhotoAccessProvider from "@/components/PhotoAccessProvider";
import { clearProtectedPhotoCache } from "@/lib/protectedPhotos";
import Wedding from "@/pages/Wedding";

type Listener = (eventName: string, session: unknown) => void;

const session = (email = "visitor@example.com", token = "valid-token") => ({
  access_token: token,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "user-1", email },
});

let listeners: Listener[] = [];
let currentSession: ReturnType<typeof session> | null = null;

const emit = (eventName: string, next: unknown) => {
  listeners.forEach((listener) => listener(eventName, next));
};

const imageResponse = () =>
  new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), { status: 200 });

const renderSite = () =>
  render(
    <MemoryRouter>
      <PhotoAccessProvider>
        <Wedding />
      </PhotoAccessProvider>
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  listeners = [];
  currentSession = null;
  clearProtectedPhotoCache();

  mocks.getSession.mockImplementation(async () => ({
    data: { session: currentSession },
    error: null,
  }));

  mocks.onAuthStateChange.mockImplementation((listener: Listener) => {
    listeners.push(listener);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  mocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });

  mocks.verifyOtp.mockImplementation(async ({ token }: { token: string }) => {
    if (token !== "123456") {
      return { data: {}, error: new Error("Token has expired or is invalid") };
    }
    currentSession = session();
    emit("SIGNED_IN", currentSession);
    return { data: { session: currentSession }, error: null };
  });

  mocks.signOut.mockImplementation(async () => {
    currentSession = null;
    emit("SIGNED_OUT", null);
    return { error: null };
  });

  vi.stubGlobal("fetch", vi.fn(async () => imageResponse()));
});

const openDialog = async () => {
  const actor = user();
  await waitFor(() => expect(screen.getByRole("button", { name: "View pictures" })).toBeEnabled());
  await actor.click(screen.getByRole("button", { name: "View pictures" }));
  return { actor, dialog: await screen.findByRole("dialog") };
};

const submitEmail = async (actor: ReturnType<typeof user>, dialog: HTMLElement) => {
  await actor.type(within(dialog).getByLabelText(/email address/i), "visitor@example.com");
  await actor.click(within(dialog).getByRole("button", { name: /send code/i }));
};

describe("email verification flow", () => {
  it("unlocks the photographs with a valid code", async () => {
    const { container } = renderSite();
    const { actor, dialog } = await openDialog();

    expect(within(dialog).getByText(/recorded against your verified email/i)).toBeInTheDocument();

    await submitEmail(actor, dialog);

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "visitor@example.com",
      options: { shouldCreateUser: true },
    });

    const codeField = await within(dialog).findByLabelText(/6-digit code/i);
    await actor.type(codeField, "123456");
    await actor.click(within(dialog).getByRole("button", { name: /verify and view/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(container.querySelectorAll("img").length).toBe(14));

    expect(screen.getByText("visitor@example.com")).toBeInTheDocument();
  });

  it.each([
    ["an invalid code", "999999", "Token has expired or is invalid"],
    ["an expired code", "111111", "Email otp expired"],
    ["an already-used code", "222222", "Token has expired or is invalid"],
  ])("rejects %s and reveals nothing", async (_label, code, message) => {
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: new Error(message) });

    const { container } = renderSite();
    const { actor, dialog } = await openDialog();
    await submitEmail(actor, dialog);

    await actor.type(await within(dialog).findByLabelText(/6-digit code/i), code);
    await actor.click(within(dialog).getByRole("button", { name: /verify and view/i }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /not valid, or it has expired or already been used/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("applies a cooldown before a code can be resent", async () => {
    renderSite();
    const { actor, dialog } = await openDialog();
    await submitEmail(actor, dialog);

    const resend = await within(dialog).findByRole("button", { name: /resend code in \d+s/i });
    expect(resend).toBeDisabled();
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it("lets the visitor correct a mistyped email", async () => {
    renderSite();
    const { actor, dialog } = await openDialog();
    await submitEmail(actor, dialog);

    await within(dialog).findByLabelText(/6-digit code/i);
    await actor.click(within(dialog).getByRole("button", { name: /use a different email/i }));

    expect(within(dialog).getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("validates the email locally before asking for a code", async () => {
    renderSite();
    const { actor, dialog } = await openDialog();

    await actor.type(within(dialog).getByLabelText(/email address/i), "not-an-email");
    await actor.click(within(dialog).getByRole("button", { name: /send code/i }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/valid email address/i);
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("can be cancelled and the visitor continues publicly", async () => {
    const { container } = renderSite();
    const { actor, dialog } = await openDialog();

    await actor.click(within(dialog).getByRole("button", { name: /continue without pictures/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "View pictures" })).toBeInTheDocument();
  });
});

describe("session lifecycle", () => {
  it("restores a verified session across a refresh", async () => {
    currentSession = session();

    const { container } = renderSite();

    await waitFor(() => expect(container.querySelectorAll("img").length).toBe(14));
    expect(screen.getByText("visitor@example.com")).toBeInTheDocument();
  });

  it("returns to the public view and drops image data on sign-out", async () => {
    currentSession = session();
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    const { container } = renderSite();
    await waitFor(() => expect(container.querySelectorAll("img").length).toBe(14));

    await user().click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(container.querySelectorAll("img")).toHaveLength(0));
    expect(mocks.signOut).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "View pictures" })).toBeInTheDocument();
  });

  it("falls back to the public view when the session has expired", async () => {
    currentSession = session();
    const { container } = renderSite();
    await waitFor(() => expect(container.querySelectorAll("img").length).toBe(14));

    // Refresh fails on the provider side.
    currentSession = null;
    emit("SIGNED_OUT", null);

    await waitFor(() => expect(container.querySelectorAll("img")).toHaveLength(0));
  });
});

describe("client-side bypass attempts", () => {
  it("cannot be unlocked by forging local storage", async () => {
    window.localStorage.setItem(
      "dnlvocatio.photo-access",
      JSON.stringify({ access_token: "forged", user: { email: "attacker@example.com" } }),
    );
    // The client only trusts what supabase-js reports, which is still nothing.
    currentSession = null;

    const { container } = renderSite();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "View pictures" })).toBeInTheDocument(),
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows no photographs when the backend rejects a forged token", async () => {
    currentSession = session("attacker@example.com", "forged-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));

    const { container } = renderSite();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getAllByText(/could not be loaded/i).length).toBeGreaterThan(0),
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("never requests a photo without a token", async () => {
    currentSession = null;
    renderSite();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "View pictures" })).toBeInTheDocument(),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
