module.exports = {
  apps: [
    {
      name: "neuroaccess-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/ubuntu/NeuroAccess",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_URL: "",
      },
    },
    {
      name: "neuroaccess-backend",
      script: "/home/ubuntu/NeuroAccess/backend/venv/bin/python3",
      args: "-m uvicorn app:app --host 0.0.0.0 --port 8000",
      cwd: "/home/ubuntu/NeuroAccess/backend",
      env: {
        // ⚠️ 敏感信息: 在服务器上用 `pm2 start ecosystem.config.js --update-env` 从环境变量注入
        OPENROUTER_API_KEY: "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",
        OPENROUTER_MODEL: "qwen/qwen-2.5-7b-instruct",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587",
        SMTP_USERNAME: "neuroaccess2026@gmail.com",
        SMTP_PASSWORD: "",  // 从环境变量读取
        SMTP_FROM: "neuroaccess2026@gmail.com",
      },
    },
  ],
};
