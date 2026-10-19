import http from "node:http";
import crypto from "node:crypto";

async function cdpEval(expression) {
  const versionRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await versionRes.json();
  const page = pages.find((p) => p.url.includes("localhost:3000/aluno")) || pages[0];
  if (!page) throw new Error("No page found");

  const wsUrl = new URL(page.webSocketDebuggerUrl);

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
      // Send CDP command
      const id = 1;
      const msg = JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: {
          expression,
          returnByValue: true,
        },
      });

      // Simple unmasked or masked frame
      // Client to server frame must be masked
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
      }
      socket.write(Buffer.concat([header, masked]));

      let responseData = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
        // Parse frame
        if (responseData.length > 2) {
          const len = responseData[1] & 0x7f;
          let offset = 2;
          let actualLen = len;
          if (len === 126) {
            actualLen = responseData.readUInt16BE(2);
            offset = 4;
          }
          if (responseData.length >= offset + actualLen) {
            const body = responseData.subarray(offset, offset + actualLen);
            socket.end();
            try {
              const parsed = JSON.parse(body.toString("utf8"));
              resolve(parsed.result?.result?.value);
            } catch (e) {
              reject(e);
            }
          }
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const result = await cdpEval(`
    (() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      const overflows = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1 || el.scrollWidth > winWidth + 1) {
          overflows.push({
            tag: el.tagName,
            id: el.id,
            className: (el.className || '').toString().slice(0, 80),
            scrollWidth: el.scrollWidth,
            rectRight: Math.round(rect.right),
            rectWidth: Math.round(rect.width),
            text: (el.innerText || '').slice(0, 30).replace(/\\n/g, ' ')
          });
        }
      }
      return { winWidth, docWidth, bodyWidth, overflowsCount: overflows.length, overflows: overflows.slice(0, 15) };
    })()
  `);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
