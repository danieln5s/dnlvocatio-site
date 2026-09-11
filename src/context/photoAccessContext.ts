import { createContext, useContext } from "react";

export type PhotoAccessStatus =
  /** Session is being restored — render the public state until this resolves. */
  | "loading"
  /** No verified session. */
  | "public"
  /** Inbox verified; protected photos may be requested. */
  | "verified"
  /** Backend is not configured, so verification cannot be offered. */
  | "unavailable";

export interface PhotoAccessContextValue {
  status: PhotoAccessStatus;
  /** Verified email address, or `null` in the public state. */
  email: string | null;
  /** Unix seconds at which the current access token expires. */
  expiresAt: number | null;
  /** Incremented whenever cached photo data is dropped (e.g. on sign-out). */
  epoch: number;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  getAccessToken: () => Promise<string | null>;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const PhotoAccessContext = createContext<PhotoAccessContextValue | null>(null);

export const usePhotoAccess = (): PhotoAccessContextValue => {
  const value = useContext(PhotoAccessContext);
  if (!value) {
    throw new Error("usePhotoAccess must be used inside <PhotoAccessProvider>");
  }
  return value;
};
