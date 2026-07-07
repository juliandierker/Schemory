// Display utility functions
// Shared display components like the Schemory logo

const CYAN = "\x1b[36m";
const BRAND_PURPLE = "\x1b[38;2;120;120;248m";
const RESET = "\x1b[0m";

export function displayLogo(): void {
  console.log("");
  console.log(`  ${CYAN}╔═╗ ╔═╗ ╦ ╦ ╔═╗ ╔╦╗ ╔═╗ ╦═╗ ╦ ╦${RESET}`);
  console.log(`  ${CYAN}╚═╗ ║   ╠═╣ ╠═  ║║║ ║ ║ ╠╦╝ ╚╦╝${RESET}`);
  console.log(`  ${CYAN}╚═╝ ╚═╝ ╩ ╩ ╚═╝ ╩ ╩ ╚═╝ ╩╚═  ╩ ${RESET}`);
  console.log("");
  console.log(`  ${BRAND_PURPLE}{ =${RESET} }  share types & schemas with your team`);
  console.log("");
}
