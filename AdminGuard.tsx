"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AdminGuard({ children }: Props) {
  return <>{children}</>;
}