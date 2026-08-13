import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const policy = JSON.parse(readFileSync("policy.json", "utf8"));
mkdirSync("bin", { recursive: true });
mkdirSync("models", { recursive: true });

const zip = `llama-${policy.llamacpp_tag}-bin-ubuntu-x64.zip`;
const url = `https://github.com/ggml-org/llama.cpp/releases/download/${policy.llamacpp_tag}/${zip}`;
if (!existsSync("bin/llama-cli")) {
  execSync(`curl -fL --retry 3 -o /tmp/llama.zip ${url}`, { stdio: "inherit" });
  execSync(`unzip -o /tmp/llama.zip -d /tmp/llama && find /tmp/llama -name llama-cli -exec cp {} bin/ \\; && find /tmp/llama -name '*.so' -exec cp {} bin/ \\; && chmod +x bin/llama-cli`, { stdio: "inherit", shell: "/bin/bash" });
}
const model = `models/${policy.model.name}.gguf`;
if (!existsSync(model)) {
  execSync(`curl -fL --retry 3 -o ${model} ${policy.model.url}`, { stdio: "inherit" });
}
console.log(JSON.stringify({ cli: "bin/llama-cli", model }));
