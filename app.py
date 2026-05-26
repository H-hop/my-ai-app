from flask import Flask, render_template, request, jsonify
import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

os.makedirs("static/sh1", exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    prompt = request.json.get("prompt", "a beautiful landscape")
    # 生图
    res = requests.post(
        "https://api.siliconflow.cn/v1/images/generations",
        headers={"Authorization": f"Bearer {SILICONFLOW_API_KEY}"},
        json={"model": "Kwai-Kolors/Kolors", "prompt": prompt, "n": 1}
    )
    url = res.json()["data"][0]["url"]
    return jsonify({"image_url": url})

if __name__ == "__main__":
    app.run(debug=True)