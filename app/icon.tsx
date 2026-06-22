import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "oklch(0.5 0.134 242.749)",
        borderRadius: "6px",
        color: "oklch(0.977 0.013 236.62)",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 14,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-0.08em",
        width: "100%",
      }}
    >
      FT
    </div>,
    size,
  )
}
