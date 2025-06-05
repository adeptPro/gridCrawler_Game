export const metadata = {
  title: 'Hire Brent',
  description: 'Hire Brent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
