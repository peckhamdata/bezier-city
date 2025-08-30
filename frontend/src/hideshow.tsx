import React, { useState } from "react";

const ToggleView: React.FC = () => {
  const [showMap, setShowMap] = useState<boolean>(false);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <button
        onClick={() => setShowMap((prev) => !prev)}
        style={{ padding: "10px 20px", marginBottom: "20px" }}
      >
        {showMap ? "Show Game" : "Show Map"}
      </button>

      <div
        style={{
          position: "relative",
          width: "600px",
          height: "400px",
          margin: "auto",
          border: "2px solid #000",
        }}
      >
        {!showMap && (
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "lightblue",
              fontSize: "24px",
            }}
          >
            Game View
          </div>
        )}

        {showMap && (
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "lightgreen",
              fontSize: "24px",
            }}
          >
            Map View
          </div>
        )}
      </div>
    </div>
  );
};

export default ToggleView;
