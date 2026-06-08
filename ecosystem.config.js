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
      args: "-m uvicorn app:app --host 0.0.0.0 --port 8000 --reload",
      cwd: "/home/ubuntu/NeuroAccess/backend",
      env: {
        OPENROUTER_API_KEY: "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",
        OPENROUTER_MODEL: "qwen/qwen-2.5-7b-instruct",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587",
        SMTP_USERNAME: "neuroaccess2026@gmail.com",
        SMTP_PASSWORD: "wjvajfrzybhpmfyde",
        SMTP_FROM: "neuroaccess2026@gmail.com",
      },
    },
  ],
};
