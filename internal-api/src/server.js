import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'

const env = loadEnv()
const app = buildApp(env)

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`internal-api listening on port ${env.PORT}`)
})
