import { ImageResponse } from "next/og";

// iOS ignores SVG icons for "Add to Home Screen"; this renders the same mark as a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c2410c",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path
            d="M32 14l6.9 14.9 16.3 1.9-12 11.2 3.2 16.1L32 50.1l-14.4 7.9 3.2-16.1-12-11.2 16.3-1.9z"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
