import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./App.css";

function App() {
  const canvasRef = useRef(null);

  const [type, setType] = useState("url");

  const [data, setData] = useState({
    url: "",
    text: "",
    email: "",
    subject: "",
    message: "",
    phone: "",
    wifiName: "",
    wifiPassword: "",
    wifiSecurity: "WPA",
  });

  const [settings, setSettings] = useState({
    size: 300,
    foreground: "#000000",
    background: "#ffffff",
    margin: 4,
    errorCorrection: "M",
  });

  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  function updateData(field, value) {
    setData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function escapeWifi(value) {
    return value.replace(/([\\;,:"])/g, "\\$1");
  }

  function buildQRData() {
    switch (type) {
      case "url":
        return data.url.trim();

      case "text":
        return data.text.trim();

      case "email":
        if (!data.email.trim()) return "";

        return `mailto:${data.email.trim()}?subject=${encodeURIComponent(
          data.subject
        )}&body=${encodeURIComponent(data.message)}`;

      case "phone":
        return data.phone.trim()
          ? `tel:${data.phone.trim()}`
          : "";

      case "wifi":
        if (!data.wifiName.trim()) return "";

        return `WIFI:T:${data.wifiSecurity};S:${escapeWifi(
          data.wifiName
        )};P:${escapeWifi(data.wifiPassword)};;`;

      default:
        return "";
    }
  }

  function validate() {
    const value = buildQRData();

    if (!value) {
      return "Enter some information to generate a QR code.";
    }

    if (type === "url") {
      try {
        new URL(data.url);
      } catch {
        return "Enter a valid URL, for example https://example.com";
      }
    }

    if (type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return "Enter a valid email address.";
      }
    }

    if (type === "phone") {
      if (!/^[+0-9\s()-]{7,}$/.test(data.phone)) {
        return "Enter a valid phone number.";
      }
    }

    return "";
  }

  useEffect(() => {
    async function generateQR() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      setGenerated(false);

      const validationError = validate();

      setError(validationError);

      if (validationError) {
        const context = canvas.getContext("2d");

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        return;
      }

      try {
        const qrData = buildQRData();

        await QRCode.toCanvas(canvas, qrData, {
          width: settings.size,
          margin: settings.margin,
          errorCorrectionLevel: settings.errorCorrection,

          color: {
            dark: settings.foreground,
            light: settings.background,
          },
        });

        setGenerated(true);

        console.log("QR generated:", qrData);
      } catch (err) {
        console.error("QR generation error:", err);

        setError(
          "QR generation failed. Check the browser console."
        );

        setGenerated(false);
      }
    }

    generateQR();
  }, [type, data, settings]);

  function downloadPNG() {
    const canvas = canvasRef.current;

    if (!canvas || !generated) {
      return;
    }

    const link = document.createElement("a");

    link.download = "qr-code.png";

    link.href = canvas.toDataURL("image/png");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function reset() {
    setType("url");

    setData({
      url: "",
      text: "",
      email: "",
      subject: "",
      message: "",
      phone: "",
      wifiName: "",
      wifiPassword: "",
      wifiSecurity: "WPA",
    });

    setSettings({
      size: 300,
      foreground: "#000000",
      background: "#ffffff",
      margin: 4,
      errorCorrection: "M",
    });

    setError("");
    setGenerated(false);
  }

  return (
    <div className="app">

      <header>
        <div>
          <h1>QR Studio</h1>
          <p>Generate. Customize. Share.</p>
        </div>

        <span className="badge">
          Browser Only
        </span>
      </header>

      <main>

        {/* LEFT SIDE */}

        <section className="panel">

          <h2>Create QR Code</h2>

          <label>QR Type</label>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="url">URL</option>
            <option value="text">Plain Text</option>
            <option value="email">Email</option>
            <option value="phone">Phone Number</option>
            <option value="wifi">Wi-Fi</option>
          </select>

          {/* URL */}

          {type === "url" && (
            <>
              <label>Website URL</label>

              <input
                type="url"
                placeholder="https://example.com"
                value={data.url}
                onChange={(e) =>
                  updateData("url", e.target.value)
                }
              />
            </>
          )}

          {/* TEXT */}

          {type === "text" && (
            <>
              <label>Text</label>

              <textarea
                placeholder="Enter your text..."
                value={data.text}
                onChange={(e) =>
                  updateData("text", e.target.value)
                }
              />
            </>
          )}

          {/* EMAIL */}

          {type === "email" && (
            <>
              <label>Email Address</label>

              <input
                type="email"
                placeholder="hello@example.com"
                value={data.email}
                onChange={(e) =>
                  updateData("email", e.target.value)
                }
              />

              <label>Subject</label>

              <input
                type="text"
                placeholder="Email subject"
                value={data.subject}
                onChange={(e) =>
                  updateData("subject", e.target.value)
                }
              />

              <label>Message</label>

              <textarea
                placeholder="Email message"
                value={data.message}
                onChange={(e) =>
                  updateData("message", e.target.value)
                }
              />
            </>
          )}

          {/* PHONE */}

          {type === "phone" && (
            <>
              <label>Phone Number</label>

              <input
                type="tel"
                placeholder="+91 9876543210"
                value={data.phone}
                onChange={(e) =>
                  updateData("phone", e.target.value)
                }
              />
            </>
          )}

          {/* WIFI */}

          {type === "wifi" && (
            <>
              <label>Network Name</label>

              <input
                type="text"
                placeholder="My WiFi"
                value={data.wifiName}
                onChange={(e) =>
                  updateData("wifiName", e.target.value)
                }
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="WiFi password"
                value={data.wifiPassword}
                onChange={(e) =>
                  updateData("wifiPassword", e.target.value)
                }
              />

              <label>Security</label>

              <select
                value={data.wifiSecurity}
                onChange={(e) =>
                  updateData(
                    "wifiSecurity",
                    e.target.value
                  )
                }
              >
                <option value="WPA">
                  WPA/WPA2
                </option>

                <option value="WEP">
                  WEP
                </option>

                <option value="nopass">
                  None
                </option>
              </select>
            </>
          )}

          <hr />

          <h2>Customize</h2>

          <label>
            Size: {settings.size}px
          </label>

          <input
            type="range"
            min="150"
            max="500"
            value={settings.size}
            onChange={(e) =>
              setSettings({
                ...settings,
                size: Number(e.target.value),
              })
            }
          />

          <label>Foreground</label>

          <input
            type="color"
            value={settings.foreground}
            onChange={(e) =>
              setSettings({
                ...settings,
                foreground: e.target.value,
              })
            }
          />

          <label>Background</label>

          <input
            type="color"
            value={settings.background}
            onChange={(e) =>
              setSettings({
                ...settings,
                background: e.target.value,
              })
            }
          />

          <label>
            Margin: {settings.margin}
          </label>

          <input
            type="range"
            min="0"
            max="10"
            value={settings.margin}
            onChange={(e) =>
              setSettings({
                ...settings,
                margin: Number(e.target.value),
              })
            }
          />

          <label>Error Correction</label>

          <select
            value={settings.errorCorrection}
            onChange={(e) =>
              setSettings({
                ...settings,
                errorCorrection: e.target.value,
              })
            }
          >
            <option value="L">Low</option>
            <option value="M">Medium</option>
            <option value="Q">Quartile</option>
            <option value="H">High</option>
          </select>

          <div className="buttons">

            <button
              onClick={downloadPNG}
              disabled={!generated}
            >
              Download PNG
            </button>

            <button
              className="secondary"
              onClick={reset}
            >
              Reset
            </button>

          </div>

        </section>

        {/* RIGHT SIDE */}

        <section className="preview">

          <h2>Preview</h2>

          <div className="qr-container">

            {error && (
              <div className="empty">
                <span>▣</span>
                <p>{error}</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              style={{
                display: generated
                  ? "block"
                  : "none",
              }}
            />

          </div>

          {generated && (
            <div className="success">
              ✓ QR code generated successfully
            </div>
          )}

        </section>

      </main>

      <footer>
        QR Studio • Built with React
      </footer>

    </div>
  );
}

export default App;