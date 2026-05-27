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
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};