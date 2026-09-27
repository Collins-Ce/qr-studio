import { useEffect, useEffectEvent, useRef, useState } from "react";
import QRCode from "qrcode";
import "./App.css";

const presets = {
  classic: {
    name: "Classic",
    foreground: "#000000",
    background: "#ffffff",
    gradient: false,
    gradientEnd: "#333333",
    moduleStyle: "square",
    eyeStyle: "square",
  },

  midnight: {
    name: "Midnight",
    foreground: "#ffffff",
    background: "#111827",
    gradient: false,
    gradientEnd: "#6b7280",
    moduleStyle: "rounded",
    eyeStyle: "rounded",
  },

  ocean: {
    name: "Ocean",
    foreground: "#075985",
    background: "#e0f2fe",
    gradient: true,
    gradientEnd: "#06b6d4",
    moduleStyle: "dots",
    eyeStyle: "circle",
  },

  minimal: {
    name: "Minimal",
    foreground: "#374151",
    background: "#f9fafb",
    gradient: false,
    gradientEnd: "#6b7280",
    moduleStyle: "rounded",
    eyeStyle: "rounded",
  },
};

const frameOptions = [
  { value: "none", label: "None" },
  { value: "simple", label: "Simple" },
  { value: "rounded", label: "Rounded" },
  { value: "scan", label: "Scan Me" },
  { value: "arrow", label: "Scan Me →" },
];

const moduleOptions = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dots", label: "Dots" },
];

const eyeOptions = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "circle", label: "Circle" },
];

function App() {
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);

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
    size: 320,
    foreground: "#000000",
    background: "#ffffff",
    margin: 4,
    errorCorrection: "M",
    gradient: false,
    gradientEnd: "#333333",
    moduleStyle: "square",
    eyeStyle: "square",
    frame: "none",
    frameText: "SCAN ME",
    logo: null,
    logoName: "",
  });

  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState("light");

  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("qrStudioRecent") || "[]"
      );
    } catch {
      return [];
    }
  });

  function updateData(field, value) {
    setData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateSettings(field, value) {
    setSettings((previous) => ({
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
        if (!data.email.trim()) {
          return "";
        }

        return `mailto:${data.email.trim()}?subject=${encodeURIComponent(
          data.subject
        )}&body=${encodeURIComponent(data.message)}`;

      case "phone":
        return data.phone.trim()
          ? `tel:${data.phone.trim()}`
          : "";

      case "wifi":
        if (!data.wifiName.trim()) {
          return "";
        }

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
        const url = new URL(data.url);

        if (!["http:", "https:"].includes(url.protocol)) {
          return "URL must start with http:// or https://";
        }
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

    if (type === "wifi" && !data.wifiName.trim()) {
      return "Enter a Wi-Fi network name.";
    }

    return "";
  }

  function getWarnings() {
    const warnings = [];

    if (settings.size < 200) {
      warnings.push(
        "Small QR codes may be harder to scan. 200px or larger is recommended."
      );
    }

    if (settings.margin < 2) {
      warnings.push(
        "A very small margin can reduce scan reliability."
      );
    }

    if (
      settings.foreground.toLowerCase() ===
      settings.background.toLowerCase()
    ) {
      warnings.push(
        "Foreground and background colors are identical."
      );
    }

    if (settings.errorCorrection === "L") {
      warnings.push(
        "Low error correction provides less protection against damage."
      );
    }

    if (settings.gradient) {
      warnings.push(
        "Always test gradient QR codes with a real phone before printing."
      );
    }

    if (settings.logo) {
      warnings.push(
        "Logo QR codes should be tested on the target device before use."
      );
    }

    return warnings;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(
      radius,
      width / 2,
      height / 2
    );

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(
      x + width,
      y,
      x + width,
      y + height,
      r
    );
    ctx.arcTo(
      x + width,
      y + height,
      x,
      y + height,
      r
    );
    ctx.arcTo(
      x,
      y + height,
      x,
      y,
      r
    );
    ctx.arcTo(
      x,
      y,
      x + width,
      y,
      r
    );
    ctx.closePath();
  }

  function drawModule(
    ctx,
    style,
    x,
    y,
    size
  ) {
    if (style === "dots") {
      ctx.beginPath();
      ctx.arc(
        x + size / 2,
        y + size / 2,
        size * 0.43,
        0,
        Math.PI * 2
      );
      ctx.fill();
      return;
    }

    if (style === "rounded") {
      roundedRect(
        ctx,
        x,
        y,
        size,
        size,
        size * 0.25
      );
      ctx.fill();
      return;
    }

    ctx.fillRect(x, y, size, size);
  }

  function drawFinder(
    ctx,
    x,
    y,
    cell,
    style
  ) {
    const outer = cell * 7;

    ctx.save();

    if (style === "circle") {
      ctx.beginPath();
      ctx.arc(
        x + outer / 2,
        y + outer / 2,
        outer / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = settings.background;

      ctx.beginPath();
      ctx.arc(
        x + outer / 2,
        y + outer / 2,
        outer * 0.32,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = settings.foreground;

      ctx.beginPath();
      ctx.arc(
        x + outer / 2,
        y + outer / 2,
        outer * 0.16,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      const radius =
        style === "rounded"
          ? cell * 1.1
          : 0;

      if (radius > 0) {
        roundedRect(
          ctx,
          x,
          y,
          outer,
          outer,
          radius
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          x,
          y,
          outer,
          outer
        );
      }

      ctx.fillStyle = settings.background;

      if (radius > 0) {
        roundedRect(
          ctx,
          x + cell,
          y + cell,
          cell * 5,
          cell * 5,
          cell * 0.8
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          x + cell,
          y + cell,
          cell * 5,
          cell * 5
        );
      }

      ctx.fillStyle = settings.foreground;

      if (radius > 0) {
        roundedRect(
          ctx,
          x + cell * 2,
          y + cell * 2,
          cell * 3,
          cell * 3,
          cell * 0.6
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          x + cell * 2,
          y + cell * 2,
          cell * 3,
          cell * 3
        );
      }
    }

    ctx.restore();
  }

  function drawFrame(
    ctx,
    qrX,
    qrY,
    qrSize
  ) {
    const frame = settings.frame;

    if (frame === "none") {
      return;
    }

    ctx.save();

    const framePadding = 18;

    ctx.strokeStyle = settings.foreground;
    ctx.lineWidth = 4;
    ctx.fillStyle = settings.background;

    if (frame === "simple") {
      ctx.strokeRect(
        qrX - framePadding,
        qrY - framePadding,
        qrSize + framePadding * 2,
        qrSize + framePadding * 2
      );
    }

    if (frame === "rounded") {
      roundedRect(
        ctx,
        qrX - framePadding,
        qrY - framePadding,
        qrSize + framePadding * 2,
        qrSize + framePadding * 2,
        22
      );

      ctx.stroke();
    }

    if (
      frame === "scan" ||
      frame === "arrow"
    ) {
      const frameHeight = 58;
      const frameTop = qrY + qrSize + 16;

      ctx.fillStyle =
        settings.foreground;

      roundedRect(
        ctx,
        qrX - framePadding,
        frameTop,
        qrSize + framePadding * 2,
        frameHeight,
        15
      );

      ctx.fill();

      ctx.fillStyle =
        settings.background;

      ctx.font =
        "700 18px Arial";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text =
        frame === "arrow"
          ? `${settings.frameText} →`
          : settings.frameText;

      ctx.fillText(
        text,
        qrX + qrSize / 2,
        frameTop + frameHeight / 2,
        qrSize + framePadding * 2 - 24
      );
    }

    ctx.restore();
  }

  function drawLogo(ctx, qrX, qrY, qrSize) {
    if (!settings.logo) {
      return;
    }

    const logoSize = qrSize * 0.20;

    const x =
      qrX +
      qrSize / 2 -
      logoSize / 2;

    const y =
      qrY +
      qrSize / 2 -
      logoSize / 2;

    ctx.save();

    ctx.fillStyle = settings.background;

    roundedRect(
      ctx,
      x - 10,
      y - 10,
      logoSize + 20,
      logoSize + 20,
      12
    );

    ctx.fill();

    const image = new Image();

    image.onload = () => {
      ctx.drawImage(
        image,
        x,
        y,
        logoSize,
        logoSize
      );
    };

    image.src = settings.logo;

    ctx.restore();
  }

  const generateQR = useEffectEvent(async () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const validationError = validate();

    setError(validationError);
    setGenerated(false);

    if (validationError) {
      const ctx = canvas.getContext("2d");

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      return;
    }

    try {
      const qrData = buildQRData();

      const qr = QRCode.create(qrData, {
        errorCorrectionLevel:
          settings.logo
            ? "H"
            : settings.errorCorrection,
      });

      const modules = qr.modules;
      const moduleCount = modules.size;

      const qrSize = settings.size;

      const frameBottom =
        settings.frame === "scan" ||
        settings.frame === "arrow"
          ? 74
          : 0;

      const quietZone =
        (qrSize / moduleCount) * settings.margin;

      const canvasSize =
        qrSize + 80 + quietZone * 2;

      canvas.width = canvasSize;
      canvas.height =
        canvasSize + frameBottom;

      const ctx = canvas.getContext("2d");

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.fillStyle =
        settings.background;

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const qrX = 40 + quietZone;
      const qrY = 40 + quietZone;

      const cell =
        qrSize / moduleCount;

      let fillStyle =
        settings.foreground;

      if (settings.gradient) {
        const gradient =
          ctx.createLinearGradient(
            qrX,
            qrY,
            qrX + qrSize,
            qrY + qrSize
          );

        gradient.addColorStop(
          0,
          settings.foreground
        );

        gradient.addColorStop(
          1,
          settings.gradientEnd
        );

        fillStyle = gradient;
      }

      ctx.fillStyle = fillStyle;

      for (let row = 0; row < moduleCount; row++) {
        for (
          let col = 0;
          col < moduleCount;
          col++
        ) {
          if (!modules.get(row, col)) {
            continue;
          }

          const x =
            qrX + col * cell;

          const y =
            qrY + row * cell;

          const isFinder =
            (row < 7 && col < 7) ||
            (row < 7 &&
              col >= moduleCount - 7) ||
            (row >= moduleCount - 7 &&
              col < 7);

          if (!isFinder) {
            drawModule(
              ctx,
              settings.moduleStyle,
              x,
              y,
              cell
            );
          }
        }
      }

      drawFinder(
        ctx,
        qrX,
        qrY,
        cell,
        settings.eyeStyle
      );

      drawFinder(
        ctx,
        qrX +
          (moduleCount - 7) *
            cell,
        qrY,
        cell,
        settings.eyeStyle
      );

      drawFinder(
        ctx,
        qrX,
        qrY +
          (moduleCount - 7) *
            cell,
        cell,
        settings.eyeStyle
      );

      drawLogo(
        ctx,
        qrX,
        qrY,
        qrSize
      );

      drawFrame(
        ctx,
        qrX,
        qrY,
        qrSize
      );

      setGenerated(true);
    } catch (err) {
      console.error(err);

      setError(
        "QR generation failed. Check the browser console."
      );

      setGenerated(false);
    }
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      generateQR();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [type, data, settings]);

  useEffect(() => {
    localStorage.setItem(
      "qrStudioRecent",
      JSON.stringify(recent)
    );
  }, [recent]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  function saveRecent() {
    const qrData = buildQRData();

    if (!qrData || error) {
      return;
    }

    const item = {
      id: Date.now(),
      type,
      data: qrData,
      label:
        type === "url"
          ? data.url
          : type === "text"
          ? data.text
          : type === "email"
          ? data.email
          : type === "phone"
          ? data.phone
          : data.wifiName,

      foreground: settings.foreground,
      background: settings.background,
      size: settings.size,
      margin: settings.margin,
      errorCorrection:
        settings.errorCorrection,

      gradient: settings.gradient,
      gradientEnd:
        settings.gradientEnd,

      moduleStyle:
        settings.moduleStyle,

      eyeStyle:
        settings.eyeStyle,

      frame: settings.frame,

      frameText:
        settings.frameText,
    };

    setRecent((previous) => {
      const filtered =
        previous.filter(
          (oldItem) =>
            oldItem.data !== item.data
        );

      return [
        item,
        ...filtered,
      ].slice(0, 8);
    });
  }

  function restoreRecent(item) {
    setType(item.type);

    setSettings((previous) => ({
      ...previous,

      foreground:
        item.foreground,

      background:
        item.background,

      size:
        item.size,

      margin:
        item.margin,

      errorCorrection:
        item.errorCorrection,

      gradient:
        item.gradient || false,

      gradientEnd:
        item.gradientEnd ||
        "#333333",

      moduleStyle:
        item.moduleStyle ||
        "square",

      eyeStyle:
        item.eyeStyle ||
        "square",

      frame:
        item.frame ||
        "none",

      frameText:
        item.frameText ||
        "SCAN ME",
    }));

    if (item.type === "url") {
      updateData(
        "url",
        item.data
      );
    }

    if (item.type === "text") {
      updateData(
        "text",
        item.data
      );
    }

    if (item.type === "phone") {
      updateData(
        "phone",
        item.data.replace(
          "tel:",
          ""
        )
      );
    }

    if (item.type === "email") {
      updateData(
        "email",
        item.data
          .replace("mailto:", "")
          .split("?")[0]
      );
    }
  }

  function deleteRecent(id) {
    setRecent((previous) =>
      previous.filter(
        (item) =>
          item.id !== id
      )
    );
  }

  function downloadPNG() {
    if (!canvasRef.current || !generated) {
      return;
    }

    const link =
      document.createElement("a");

    link.download =
      "qr-studio-design.png";

    link.href =
      canvasRef.current.toDataURL(
        "image/png"
      );

    link.click();

    saveRecent();
  }

  async function downloadSVG() {
    if (!generated) {
      return;
    }

    try {
      const png =
        canvasRef.current.toDataURL(
          "image/png"
        );

      const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${canvasRef.current.width}"
     height="${canvasRef.current.height}"
     viewBox="0 0 ${canvasRef.current.width} ${canvasRef.current.height}">
  <image
    href="${png}"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
  />
</svg>`;

      const blob =
        new Blob(
          [svg],
          {
            type: "image/svg+xml",
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        "qr-studio-design.svg";

      link.click();

      URL.revokeObjectURL(url);

      saveRecent();
    } catch (err) {
      console.error(err);
    }
  }

  async function copyQR() {
    if (!canvasRef.current || !generated) {
      return;
    }

    try {
      const blob =
        await new Promise((resolve) =>
          canvasRef.current.toBlob(
            resolve,
            "image/png"
          )
        );

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      setError(
        "Clipboard access is not available in this browser."
      );
    }
  }

  function applyPreset(name) {
    const preset = presets[name];

    setSettings((previous) => ({
      ...previous,

      foreground:
        preset.foreground,

      background:
        preset.background,

      gradient:
        preset.gradient,

      gradientEnd:
        preset.gradientEnd,

      moduleStyle:
        preset.moduleStyle,

      eyeStyle:
        preset.eyeStyle,
    }));
  }

  function handleLogo(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select an image file."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setSettings((previous) => ({
        ...previous,

        logo:
          reader.result,

        logoName:
          file.name,
      }));
    };

    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setSettings((previous) => ({
      ...previous,
      logo: null,
      logoName: "",
    }));
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
      size: 320,
      foreground: "#000000",
      background: "#ffffff",
      margin: 4,
      errorCorrection: "M",
      gradient: false,
      gradientEnd: "#333333",
      moduleStyle: "square",
      eyeStyle: "square",
      frame: "none",
      frameText: "SCAN ME",
      logo: null,
      logoName: "",
    });

    setError("");
    setGenerated(false);
  }

  const warnings = getWarnings();

  return (
    <div className="app">

      <header>
        <div>
          <h1>QR Studio</h1>
          <p>
            Generate. Design. Share.
          </p>
        </div>

        <div className="header-actions">

          <button
            type="button"
            className="theme-button"
            aria-label={
              theme === "light"
                ? "Switch to dark theme"
                : "Switch to light theme"
            }
            title={
              theme === "light"
                ? "Switch to dark theme"
                : "Switch to light theme"
            }
            onClick={() =>
              setTheme(
                theme === "light"
                  ? "dark"
                  : "light"
              )
            }
          >
            {theme === "light"
              ? "🌙"
              : "☀️"}
          </button>

          <span className="badge">
            Browser Only
          </span>

        </div>
      </header>

      <main>

        <section className="panel">

          <div className="section-title">
            <span className="step-number">
              1
            </span>

            <div>
              <h2>Content</h2>
              <p>
                Choose what your QR code should contain.
              </p>
            </div>
          </div>

          <label>QR Type</label>

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value)
            }
          >
            <option value="url">
              Website URL
            </option>

            <option value="text">
              Plain Text
            </option>

            <option value="email">
              Email
            </option>

            <option value="phone">
              Phone Number
            </option>

            <option value="wifi">
              Wi-Fi
            </option>
          </select>

          {type === "url" && (
            <>
              <label>
                Website URL
              </label>

              <input
                type="url"
                placeholder="https://example.com"
                value={data.url}
                onChange={(e) =>
                  updateData(
                    "url",
                    e.target.value
                  )
                }
              />
            </>
          )}

          {type === "text" && (
            <>
              <label>
                Text
              </label>

              <textarea
                placeholder="Enter your text..."
                value={data.text}
                onChange={(e) =>
                  updateData(
                    "text",
                    e.target.value
                  )
                }
              />
            </>
          )}

          {type === "email" && (
            <>
              <label>
                Email Address
              </label>

              <input
                type="email"
                placeholder="hello@example.com"
                value={data.email}
                onChange={(e) =>
                  updateData(
                    "email",
                    e.target.value
                  )
                }
              />

              <label>
                Subject
              </label>

              <input
                placeholder="Email subject"
                value={data.subject}
                onChange={(e) =>
                  updateData(
                    "subject",
                    e.target.value
                  )
                }
              />

              <label>
                Message
              </label>

              <textarea
                placeholder="Email message"
                value={data.message}
                onChange={(e) =>
                  updateData(
                    "message",
                    e.target.value
                  )
                }
              />
            </>
          )}

          {type === "phone" && (
            <>
              <label>
                Phone Number
              </label>

              <input
                type="tel"
                placeholder="+91 9876543210"
                value={data.phone}
                onChange={(e) =>
                  updateData(
                    "phone",
                    e.target.value
                  )
                }
              />
            </>
          )}

          {type === "wifi" && (
            <>
              <label>
                Network Name
              </label>

              <input
                placeholder="My WiFi"
                value={data.wifiName}
                onChange={(e) =>
                  updateData(
                    "wifiName",
                    e.target.value
                  )
                }
              />

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="WiFi password"
                value={data.wifiPassword}
                onChange={(e) =>
                  updateData(
                    "wifiPassword",
                    e.target.value
                  )
                }
              />

              <label>
                Security
              </label>

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

          <div className="section-title">
            <span className="step-number">
              2
            </span>

            <div>
              <h2>Design</h2>
              <p>
                Make your QR code yours.
              </p>
            </div>
          </div>

          <label>
            Presets
          </label>

          <div className="presets">

            {Object.entries(
              presets
            ).map(
              ([key, preset]) => (
                <button
                  key={key}
                  className="preset"
                  onClick={() =>
                    applyPreset(key)
                  }
                >
                  <span
                    className="preset-preview"
                    style={{
                      background:
                        preset.background,
                      color:
                        preset.foreground,
                    }}
                  >
                    ▦
                  </span>

                  {preset.name}
                </button>
              )
            )}

          </div>

          <label>
            Frame
          </label>

          <div
            className="frame-options"
            role="group"
            aria-label="Choose a QR frame"
          >
            {frameOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  settings.frame === option.value
                    ? "frame-option active"
                    : "frame-option"
                }
                aria-label={`Frame: ${option.label}`}
                aria-pressed={settings.frame === option.value}
                onClick={() =>
                  updateSettings("frame", option.value)
                }
              >
                <span
                  className={`frame-sample frame-sample-${option.value}`}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                  {(option.value === "scan" || option.value === "arrow") && (
                    <b>{option.value === "arrow" ? "SCAN →" : "SCAN ME"}</b>
                  )}
                </span>
                <span className="frame-option-label">
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          {settings.frame !==
            "none" && (
            <>
              <label>
                Frame Text
              </label>

              <input
                value={
                  settings.frameText
                }
                onChange={(e) =>
                  updateSettings(
                    "frameText",
                    e.target.value
                  )
                }
                placeholder="SCAN ME"
              />
            </>
          )}

          <label>
            QR Pattern
          </label>

          <div className="style-buttons">

            {moduleOptions.map(
              (option) => (
                <button
                  key={option.value}
                  className={
                    settings.moduleStyle ===
                    option.value
                      ? "style-option active"
                      : "style-option"
                  }
                  onClick={() =>
                    updateSettings(
                      "moduleStyle",
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}

          </div>

          <label>
            Eye Style
          </label>

          <div className="style-buttons">

            {eyeOptions.map(
              (option) => (
                <button
                  key={option.value}
                  className={
                    settings.eyeStyle ===
                    option.value
                      ? "style-option active"
                      : "style-option"
                  }
                  onClick={() =>
                    updateSettings(
                      "eyeStyle",
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}

          </div>

          <label>
            Foreground
          </label>

          <input
            type="color"
            value={
              settings.foreground
            }
            onChange={(e) =>
              updateSettings(
                "foreground",
                e.target.value
              )
            }
          />

          <label>
            Background
          </label>

          <input
            type="color"
            value={
              settings.background
            }
            onChange={(e) =>
              updateSettings(
                "background",
                e.target.value
              )
            }
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={
                settings.gradient
              }
              onChange={(e) =>
                updateSettings(
                  "gradient",
                  e.target.checked
                )
              }
            />

            Enable Gradient
          </label>

          {settings.gradient && (
            <>
              <label>
                Gradient End
              </label>

              <input
                type="color"
                value={
                  settings.gradientEnd
                }
                onChange={(e) =>
                  updateSettings(
                    "gradientEnd",
                    e.target.value
                  )
                }
              />
            </>
          )}

          <label>
            Logo
          </label>

          <div className="logo-controls">

            <button
              className="secondary"
              onClick={() =>
                logoInputRef.current?.click()
              }
            >
              {settings.logo
                ? "Change Logo"
                : "Upload Logo"}
            </button>

            {settings.logo && (
              <button
                className="delete-button"
                onClick={removeLogo}
              >
                Remove
              </button>
            )}

          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogo}
          />

          {settings.logoName && (
            <p className="file-name">
              ✓ {settings.logoName}
            </p>
          )}

          <label>
            Size: {settings.size}px
          </label>

          <input
            type="range"
            min="180"
            max="500"
            value={
              settings.size
            }
            onChange={(e) =>
              updateSettings(
                "size",
                Number(e.target.value)
              )
            }
          />

          <label>
            Margin: {settings.margin}
          </label>

          <input
            type="range"
            min="0"
            max="10"
            value={
              settings.margin
            }
            onChange={(e) =>
              updateSettings(
                "margin",
                Number(e.target.value)
              )
            }
          />

          <label>
            Error Correction
          </label>

          <select
            value={
              settings.errorCorrection
            }
            onChange={(e) =>
              updateSettings(
                "errorCorrection",
                e.target.value
              )
            }
            disabled={
              Boolean(settings.logo)
            }
          >
            <option value="L">
              Low
            </option>

            <option value="M">
              Medium
            </option>

            <option value="Q">
              Quartile
            </option>

            <option value="H">
              High
            </option>
          </select>

          {settings.logo && (
            <p className="hint">
              High error correction is automatically
              used when a logo is added.
            </p>
          )}

          <div className="buttons">
            <button
              onClick={downloadPNG}
              disabled={!generated}
            >
              Download PNG
            </button>

            <button
              onClick={downloadSVG}
              disabled={!generated}
            >
              Download SVG
            </button>
          </div>

          <div className="buttons">
            <button
              className="secondary"
              onClick={copyQR}
              disabled={!generated}
            >
              {copied
                ? "✓ Copied"
                : "Copy QR"}
            </button>

            <button
              className="secondary"
              onClick={reset}
            >
              Reset
            </button>
          </div>

        </section>

        <section className="preview">

          <div className="preview-header">
            <div>
              <div className="section-title">
                <span className="step-number">
                  3
                </span>

                <div>
                  <h2>Preview</h2>
                  <p>
                    Your finished QR design.
                  </p>
                </div>
              </div>
            </div>

            {generated && (
              <span className="live-badge">
                ● LIVE
              </span>
            )}
          </div>

          <div className="qr-container">

            {error && (
              <div className="empty">
                <span>▣</span>
                <p>{error}</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Generated QR code preview"
              style={{
                display: generated
                  ? "block"
                  : "none",
              }}
            />

          </div>

          {generated && (
            <div className="success">
              ✓ QR design generated successfully
            </div>
          )}

          {generated &&
            warnings.length > 0 && (
              <div className="warnings">

                <strong>
                  ⚠ Scan reliability
                </strong>

                {warnings.map(
                  (warning, index) => (
                    <p key={index}>
                      • {warning}
                    </p>
                  )
                )}

              </div>
            )}

          {generated &&
            warnings.length === 0 && (
              <div className="safe">
                ✓ Current design looks
                scan-friendly
              </div>
            )}

        </section>

      </main>

      <section className="recent-section">

        <div className="recent-header">
          <h2>
            Recent Designs
          </h2>

          <p>
            Stored locally in your browser.
          </p>
        </div>

        {recent.length === 0 ? (
          <div className="recent-empty">
            Generate and download a QR code
            to see your recent designs here.
          </div>
        ) : (
          <div className="recent-grid">

            {recent.map((item) => (
              <div
                className="recent-card"
                key={item.id}
              >
                <div
                  className="recent-icon"
                  style={{
                    background:
                      item.background,
                    color:
                      item.foreground,
                  }}
                >
                  ▦
                </div>

                <div className="recent-info">
                  <strong>
                    {item.type.toUpperCase()}
                  </strong>

                  <span>
                    {item.label ||
                      "QR Design"}
                  </span>
                </div>

                <div className="recent-actions">

                  <button
                    onClick={() =>
                      restoreRecent(item)
                    }
                  >
                    Use Again
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteRecent(
                        item.id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}

      </section>

      <footer>
        QR Studio • React + QRCode.js
        • Browser Only
      </footer>

    </div>
  );
}

export default App;