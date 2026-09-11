import { Lock, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePhotoAccess } from "@/context/photoAccessContext";
import { cn } from "@/lib/utils";

interface Props {
  /** What the visitor unlocks here, e.g. "the wedding photographs". */
  subject?: string;
  className?: string;
}

/**
 * The single, clear "View pictures" action for a page that contains protected
 * photographs, plus the signed-in state and sign-out.
 */
const PhotoAccessGate = ({ subject = "the photographs on this page", className }: Props) => {
  const { status, email, openDialog, signOut } = usePhotoAccess();

  if (status === "loading") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted px-6 py-4 text-sm text-muted-foreground",
          className,
        )}
        aria-busy="true"
      >
        Checking photo access…
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted px-6 py-4 text-sm text-muted-foreground",
          className,
        )}
      >
        Pictures are not available right now.
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border bg-muted px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          Showing pictures for <span className="text-foreground">{email}</span>. Access lasts about
          an hour and renews while you browse.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void signOut()}
          className="shrink-0 self-start sm:self-auto"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-muted px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        <Lock className="mr-2 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
        To see {subject}, verify your email with a one-time code. Photo requests are recorded
        against that address.
      </p>
      <Button type="button" size="sm" onClick={openDialog} className="shrink-0 self-start sm:self-auto">
        View pictures
      </Button>
    </div>
  );
};

export default PhotoAccessGate;
