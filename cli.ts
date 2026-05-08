import { convert } from "./src/convert"
const input = await Bun.stdin.text()
process.stdout.write(convert(input))
