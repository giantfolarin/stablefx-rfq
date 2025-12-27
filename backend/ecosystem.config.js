module.exports = {
  apps: [
    {
      name: 'stablefx-api',
      script: 'node_modules/ts-node-dev/lib/bin.js',
      args: '--respawn --transpile-only src/main.ts',
      cwd: 'c:/Users/simpl/Desktop/Stablecoin FX Micro-Exchange/stablefx-demo/backend',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
      },
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    },
    {
      name: 'system-maker',
      script: 'node_modules/ts-node/dist/bin.js',
      args: 'services/systemMaker.ts',
      cwd: 'c:/Users/simpl/Desktop/Stablecoin FX Micro-Exchange/stablefx-demo/backend',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
      },
      error_file: 'logs/system-maker-error.log',
      out_file: 'logs/system-maker-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
}
