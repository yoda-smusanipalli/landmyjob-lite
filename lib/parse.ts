import "server-only";
import { bufferToText, UserFacingError } from "./extract-text";

export { normalize } from "./extract-text";

/** Reads an uploaded File. Throws an Error whose message is safe to show the user. */
export async function fileToText(file: File): Promise<string> {
  try {
    return await bufferToText(file.name, file.type, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    console.error("File parsing failed", e);
    throw new Error("Couldn't read that file. Try another format, or paste the text instead.");
  }
}
