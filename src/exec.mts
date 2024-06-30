import { execFileSync } from "child_process";

export function syncCapture(...exec: Parameters<typeof execFileSync>) {
  const [file, args, opts] = exec;
  return execFileSync(file, args, {
    ...opts,
    stdio: "pipe",
    encoding: "utf-8",
  });
}

export function syncLoud(...exec: Parameters<typeof execFileSync>) {
  const [file, args, opts] = exec;
  return execFileSync(file, args, {
    ...opts,
    stdio: "inherit",
    encoding: "utf-8",
  });
}
