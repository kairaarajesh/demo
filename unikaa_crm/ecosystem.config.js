module.exports = {
  apps: [
    {
      name: "unikaa_crm_front",
      script: "npm",
      args: "start",
      env: {
        PORT: 7895,
        NODE_ENV: "production",
      },
    },
  ],
};