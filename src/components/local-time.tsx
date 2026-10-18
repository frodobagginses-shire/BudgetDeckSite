"use client";

import { useSyncExternalStore } from "react";

const DATE: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const noSubscribe = () => () => {};

/** A timestamp shown in the viewer's own time zone. The server (and the
 * hydration pass) render the date in UTC so the markup matches; the browser
 * then shows the local date — and time, when asked. */
export function LocalTime({
  iso,
  withTime = false,
  long = false,
}: {
  iso: string;
  withTime?: boolean;
  long?: boolean;
}) {
  const opts: Intl.DateTimeFormatOptions = long
    ? { ...DATE, month: "long" }
    : DATE;
  const text = useSyncExternalStore(
    noSubscribe,
    () =>
      withTime
        ? new Date(iso).toLocaleString("en-US", {
            ...opts,
            hour: "numeric",
            minute: "2-digit",
          })
        : new Date(iso).toLocaleDateString("en-US", opts),
    () =>
      new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" })
  );
  return <time dateTime={iso}>{text}</time>;
}
