import "./globals.css";

export const metadata = {
  title: "Senda Natural",
  description: "Diagnóstico de piel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}