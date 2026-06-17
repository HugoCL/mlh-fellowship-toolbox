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
        background: "linear-gradient(135deg, #0f4fbd 0%, #35a9f4 100%)",
        color: "#f7fcff",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-0.12em",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.18)",
          borderRadius: "999px",
          height: 28,
          left: -8,
          position: "absolute",
          top: -10,
          width: 28,
        }}
      />
      <div
        style={{
          background: "rgba(1, 21, 55, 0.18)",
          borderRadius: "999px",
          bottom: -9,
          height: 24,
          position: "absolute",
          right: -6,
          width: 24,
        }}
      />
      <div
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 16,
          fontWeight: 800,
          lineHeight: 1,
          marginLeft: -1,
          marginTop: 1,
        }}
      >
        FT
      </div>
    </div>,
    size,
  )
}
