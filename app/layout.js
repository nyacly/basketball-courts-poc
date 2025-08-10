// app/layout.js
import './globals.css'   // <-- this is required for styles to load

export const metadata = {
  title: 'Basketball Courts POC',
  description: 'Find courts, RSVP, and check in to play',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="brand">
            Hoops Near Me <span className="badge">POC</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, opacity: .8 }}>
            Brisbane & Moreton Bay
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
