import prompts from "prompts";

export async function okOrQuit(message: string) {
  const { ok } = await prompts({
    type: "confirm",
    name: "ok",
    message,
    stdout: process.stderr,
    onState: (state) => {
      // handle sigint
      if (state.aborted) {
        process.nextTick(() => {
          process.exit(0);
        });
      }
    },
  });

  if (ok) {
    return;
  }
  process.exit(1);
}
