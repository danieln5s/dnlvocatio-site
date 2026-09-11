import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { applyConsent, readConsent, setConsent } from "@/lib/consent";

/**
 * Optional-analytics banner.
 *
 * Declining only turns off Google Analytics. Verifying an email and viewing
 * photographs works exactly the same either way.
 */
const AnalyticsConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      applyConsent(stored);
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (choice: "granted" | "denied") => {
    setConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Analytics choice"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          May I use Google Analytics to count anonymous visits? This is optional — declining does not
          affect viewing the pictures.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => choose("denied")}>
            Decline
          </Button>
          <Button type="button" size="sm" onClick={() => choose("granted")}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsConsent;
