import { runItemCodeFetch } from "./item-code/run";

runItemCodeFetch().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
