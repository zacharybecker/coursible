"use client";

// Last-resort boundary for errors thrown in the root layout itself (where
// app/error.tsx can't reach). Must render its own <html>/<body>.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          The app failed to load. Please try again.
        </p>
        {error.digest && (
          <p style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Reference: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
