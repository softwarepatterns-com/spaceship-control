import { execSync } from "child_process";

export const displayDotFile = (dotContent) => {
  console.log("displayDotFile", dotContent);

  // Convert DOT to PNG and get the output as a Buffer
  const pngBuffer = execSync("dot -Tpng", { input: dotContent });

  // Convert the image to Base64
  const base64Image = pngBuffer.toString("base64");

  const height = 800; // height in pixels

  // Output the image with iTerm2's inline image display escape codes
  process.stdout.write(
    `\u001B]1337;File=inline=1;height=${height}px:${base64Image}\u0007`
  );
  console.log("");
};
