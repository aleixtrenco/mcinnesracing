// Load Playwright from the project if it is installed (npm install playwright),
// otherwise from the copy preinstalled in Claude's cloud containers.
try {
  module.exports = require("playwright");
} catch {
  module.exports = require("/opt/node22/lib/node_modules/playwright");
}
