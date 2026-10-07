import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
test("live fictional farmer field workflow persists and cleans up safely", async ({}, testInfo) => {
  const phone = process.env.AGROMAN_LIVE_TEST_PHONE;
  const code = process.env.AGROMAN_LIVE_TEST_CODE;
  test.skip(!phone || !code || testInfo.project.name !== "desktop", "Explicit fictional Firebase test credentials are required.");
  test.setTimeout(120000);
  // No retired phone-login UI or deletion of pre-existing farmer records.
  // The script refuses to mutate an account that already has a profile.
  const { stdout } = await run(process.execPath, ["scripts/field-live-smoke.mjs"], {
    env: { ...process.env, AGROMAN_FIELD_SMOKE_PHONE: phone, AGROMAN_FIELD_SMOKE_CODE: code },
    timeout: 110000,
  });
  expect(stdout).toContain('"liveFieldWorkflow":"passed"');
  expect(stdout).toContain('"syntheticTestRecordCleanup":"passed"');
});
