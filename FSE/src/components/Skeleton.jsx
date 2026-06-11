import { memo } from "react";

function ShimmerBlock({ style = {} }) {
  return (
    <div
      style={{
        borderRadius: "6px",
        background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function Skeleton({ className = "", width = "100%", height = "16px", style = {} }) {
  return (
    <div
      className={className}
      style={{ width, height, borderRadius: "6px", ...style }}
    />
  );
}

export const SkeletonDashboard = memo(function SkeletonDashboard() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ padding: "18px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
          <ShimmerBlock style={{ height: "12px", width: "45%", marginBottom: "10px" }} />
          <ShimmerBlock style={{ height: "26px", width: "60%", marginBottom: "8px" }} />
          <ShimmerBlock style={{ height: "12px", width: "35%" }} />
        </div>
      ))}
      <div style={{ gridColumn: "1 / -1", padding: "18px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <ShimmerBlock style={{ height: "12px", width: "30%", marginBottom: "16px" }} />
        <ShimmerBlock style={{ height: "200px", width: "100%" }} />
      </div>
      <div style={{ gridColumn: "1 / -1", padding: "18px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <ShimmerBlock style={{ height: "12px", width: "25%", marginBottom: "16px" }} />
        <ShimmerBlock style={{ height: "80px", width: "100%", marginBottom: "8px" }} />
        <ShimmerBlock style={{ height: "80px", width: "100%", marginBottom: "8px" }} />
        <ShimmerBlock style={{ height: "80px", width: "100%" }} />
      </div>
    </div>
  );
});

export const SkeletonTable = memo(function SkeletonTable({ rows = 6 }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: "12px", paddingBottom: "10px", borderBottom: "2px solid #e2e8f0", marginBottom: "4px" }}>
        <ShimmerBlock style={{ flex: 1, height: "13px" }} />
        <ShimmerBlock style={{ flex: 2, height: "13px" }} />
        <ShimmerBlock style={{ flex: 1, height: "13px" }} />
        <ShimmerBlock style={{ flex: 1, height: "13px" }} />
        <ShimmerBlock style={{ flex: 1, height: "13px" }} />
        <ShimmerBlock style={{ flex: 0.7, height: "13px" }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
          <ShimmerBlock style={{ flex: 1, height: "14px" }} />
          <ShimmerBlock style={{ flex: 2, height: "14px" }} />
          <ShimmerBlock style={{ flex: 1, height: "14px" }} />
          <ShimmerBlock style={{ flex: 1, height: "14px" }} />
          <ShimmerBlock style={{ flex: 1, height: "14px" }} />
          <ShimmerBlock style={{ flex: 0.7, height: "32px", borderRadius: "6px" }} />
        </div>
      ))}
    </div>
  );
});

export const SkeletonForm = memo(function SkeletonForm({ lines = 7 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <ShimmerBlock style={{ height: "13px", width: i === 0 ? "20%" : "28%" }} />
          <ShimmerBlock style={{ height: "42px", width: "100%" }} />
        </div>
      ))}
      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <ShimmerBlock style={{ height: "42px", width: "120px", borderRadius: "8px" }} />
        <ShimmerBlock style={{ height: "42px", width: "140px", borderRadius: "8px" }} />
      </div>
    </div>
  );
});

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div style={{ padding: "20px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
      <ShimmerBlock style={{ height: "12px", width: "30%", marginBottom: "14px" }} />
      <ShimmerBlock style={{ height: "14px", width: "90%", marginBottom: "8px" }} />
      <ShimmerBlock style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
      <ShimmerBlock style={{ height: "14px", width: "50%" }} />
    </div>
  );
});

export const SkeletonAttend = memo(function SkeletonAttend() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px" }}>
      <div style={{ padding: "20px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <ShimmerBlock style={{ height: "14px", width: "40%", marginBottom: "16px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <ShimmerBlock style={{ height: "12px", width: "30%", marginBottom: "6px" }} />
              <ShimmerBlock style={{ height: "38px", width: "100%" }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <ShimmerBlock style={{ height: "14px", width: "35%", marginBottom: "16px" }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
            <ShimmerBlock style={{ width: "48px", height: "48px", borderRadius: "8px", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <ShimmerBlock style={{ height: "14px", width: "70%" }} />
              <ShimmerBlock style={{ height: "12px", width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const SkeletonQR = memo(function SkeletonQR() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ padding: "20px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <ShimmerBlock style={{ height: "14px", width: "28%", marginBottom: "14px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <ShimmerBlock style={{ height: "14px", width: "60%", marginBottom: "10px" }} />
              <ShimmerBlock style={{ height: "12px", width: "100%", marginBottom: "6px" }} />
              <ShimmerBlock style={{ height: "12px", width: "70%", marginBottom: "12px" }} />
              <ShimmerBlock style={{ height: "32px", width: "100%", borderRadius: "6px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
