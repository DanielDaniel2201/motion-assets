import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chatDialogDefinition, cloneChatDialogParameters } from "../src/assets/chat-dialog/definition.ts";
import { getCenteredBlockTop, getMessageProgress } from "../src/assets/chat-dialog/timeline.ts";

test("messages reveal in order while the visible block remains centered", () => {
  const parameters = cloneChatDialogParameters(chatDialogDefinition.defaultParameters);
  assert.deepEqual(parameters.messages.slice(0, 2).map((message) => message.side), ["left", "left"]);
  assert.equal(getMessageProgress(1, parameters.messageInterval - 0.01, parameters.messageInterval), 0);
  assert.equal(getMessageProgress(1, parameters.messageInterval + 1, parameters.messageInterval), 1);
  assert.equal(getCenteredBlockTop(1080, 400), 340);
  assert.ok(Math.abs(chatDialogDefinition.getDuration(parameters, 0) - 4.8) < 1e-9);
});

test("chat bubbles use a closed rectangle without a detached tail", async () => {
  const renderer = await readFile(new URL("../src/assets/chat-dialog/render.ts", import.meta.url), "utf8");
  assert.match(renderer, /arcTo\(x, y \+ height, x, y, r\)/);
  assert.doesNotMatch(renderer, /lineTo\(bubbleX/);
});
