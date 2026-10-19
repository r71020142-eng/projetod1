import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

function sendCDP(socket, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify({ id, method, params });
    const payload = Buffer.from(msg);
    const mask = crypto.randomBytes(4);
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      masked[i] = payload[i] ^ mask[i % 4];
    }

    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length, ...mask]);
    } else if (payload.length < 65536) {
      header = Buffer.from([0x81, 0x80 | 126, (payload.length >> 8) & 0xff, payload.length & 0xff, ...mask]);
    } else {
      header = Buffer.from([
        0x81,
        0x80 | 127,
        0, 0, 0, 0,
        (payload.length >> 24) & 0xff,
        (payload.length >> 16) & 0xff,
        (payload.length >> 8) & 0xff,
        payload.length & 0xff,
        ...mask
      ]);
    }
    socket.write(Buffer.concat([header, masked]));

    const onData = (chunk) => {
      // For multi-packet response, keep reading until complete
      socket.readBuffer = Buffer.concat([socket.readBuffer || Buffer.alloc(0), chunk]);
      const buf = socket.readBuffer;
      if (buf.length > 2) {
        let len = buf[1] & 0x7f;
        let offset = 2;
        if (len === 126) {
          len = buf.readUInt16BE(2);
          offset = 4;
        } else if (len === 127) {
          len = Number(buf.readBigUInt64BE(2));
          offset = 10;
        }
        if (buf.length >= offset + len) {
          const body = buf.subarray(offset, offset + len);
          socket.readBuffer = buf.subarray(offset + len);
          socket.off("data", onData);
          try {
            const parsed = JSON.parse(body.toString("utf8"));
            if (parsed.id === id) {
              resolve(parsed.result);
            } else {
              socket.on("data", onData);
            }
          } catch (e) {
            reject(e);
          }
        }
      }
    };
    socket.on("data", onData);
  });
}

async function connectCDP(url) {
  const wsUrl = new URL(url);
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const req = http.request({
      hostname: wsUrl.hostname,
      port: wsUrl.port,
      path: wsUrl.pathname,
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Key": key,
        "Sec-WebSocket-Version": "13",
      },
    });

    req.on("upgrade", (res, socket) => {
      resolve(socket);
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await versionRes.json();
  const page = pages.find((p) => p.url.includes("localhost:3000/aluno")) || pages[0];
  if (!page) throw new Error("No page found");

  const socket = await connectCDP(page.webSocketDebuggerUrl);

  // Set mobile device emulation: 390x844, scale 1, mobile true
  await sendCDP(socket, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  }, 1);

  // Wait 1 second for resize & rerender
  await new Promise((r) => setTimeout(r, 1000));

  // Check window.innerWidth inside the page
  const evalRes = await sendCDP(socket, "Runtime.evaluate", {
    expression: "JSON.stringify({ winWidth: window.innerWidth, docWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth })",
    returnByValue: true,
  }, 2);

  console.log("Evaluated metrics:", evalRes.result.value);

  // Take screenshot
  const screenshotRes = await sendCDP(socket, "Page.captureScreenshot", {
    format: "png",
  }, 3);

  const imgBuf = Buffer.from(screenshotRes.data, "base64");
  fs.writeFileSync("scripts/dashboard-aluno-mobile-390x844.png", imgBuf);
  fs.copyFileSync("scripts/dashboard-aluno-mobile-390x844.png", "/Users/raypires/.gemini/antigravity/brain/a58cdfc3-defb-4b97-b470-30f53b4a770e/dashboard-aluno-mobile-390x844.png");
  console.log("Screenshot saved successfully! Size:", imgBuf.length, "bytes");

  socket.end();
}

main().catch(console.error);
