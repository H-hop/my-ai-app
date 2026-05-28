const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function sendFeishuNotification(prompt, imageUrl, savedPath) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("FEISHU_WEBHOOK_URL not set, skipping notification");
    return;
  }

  const body = {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: "AI 生图完成" },
        template: "green"
      },
      elements: [
        {
          tag: "div",
          text: { tag: "lark_md", content: `**提示词：**\n${prompt}` }
        },
        {
          tag: "hr"
        },
        {
          tag: "note",
          elements: [
            { tag: "plain_text", content: `已保存至：${savedPath}` }
          ]
        },
        {
          tag: "action",
          actions: [{
            tag: "button",
            text: { tag: "plain_text", content: "查看原图" },
            url: imageUrl,
            type: "default"
          }]
        }
      ]
    }
  };

  const feishuRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const feishuData = await feishuRes.json();
  console.log("Feishu webhook response:", JSON.stringify(feishuData));
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { prompt } = JSON.parse(event.body);

  const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "Kwai-Kolors/Kolors",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    })
  });

  const data = await response.json();
  const imageUrl = data?.data?.[0]?.url;

  if (imageUrl) {
    const filename = `${Date.now()}.png`;
    const dir = path.resolve(__dirname, "..", "..", "static", "sh1");

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, filename);
      await downloadFile(imageUrl, filePath);
      await sendFeishuNotification(prompt, imageUrl, `static/sh1/${filename}`);
    } catch (err) {
      console.error("Failed to save image locally:", err.message);
      await sendFeishuNotification(prompt, imageUrl, "未能保存");
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
