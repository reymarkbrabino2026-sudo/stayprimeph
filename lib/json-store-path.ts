import path from "node:path";

export function jsonStorePath(fileName: string) {
  const baseDir = process.env.VERCEL ? path.join("/tmp", "stayprimeph-data") : path.join(process.cwd(), "data");
  return path.join(baseDir, fileName);
}
