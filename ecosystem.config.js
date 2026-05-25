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
      script: "python3",
      args: "-m uvicorn app:app --host 0.0.0.0 --port 8000 --reload",
      cwd: "/home/ubuntu/NeuroAccess/backend",
    },
  ],
};
