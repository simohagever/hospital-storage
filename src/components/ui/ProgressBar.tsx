"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#0369A1"
      options={{ showSpinner: true }}
      spinnerPosition="top-right"
      shallowRouting
    />
  );
}
