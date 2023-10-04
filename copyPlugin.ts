/// <reference path="./node_modules/bun-types/types.d.ts" />
import { BunPlugin } from 'bun';
import { readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export function copyPlugin(from: string, to: string): BunPlugin {
  return from.endsWith('/')
   ? copyDirectoryPlugin(from, to)
   : copyFilePlugin(from, to)
}

export function copyFilePlugin (from: string, to: string): BunPlugin {
  return {
    name: 'copyFilePlugin',
    async setup(): Promise<void> {
      return copyFile(from, to)
    },
  }
}

export function copyDirectoryPlugin (from: string, to: string): BunPlugin {
  return {
    name: 'copyDirectoryPlugin',
    async setup(): Promise<void> {
      return copyDirectory(from, to)
    }
  }
}

export async function copyFile(from: string, to: string): Promise<void> {
  await Bun.write(to, Bun.file(from))
}

export async function copyDirectory(from: string, to: string): Promise<void> {
  const files = await readdir(from, { withFileTypes: true})
  const promises = files.map(async file => {
    const infile = join(from, file.name)
    const outfile = join(to, file.name)
    if (file.isDirectory()) {
      await mkdir(outfile, { recursive: true })
      await copyDirectory(infile, outfile)
    } else {
      await copyFile(infile, outfile)
    }
  })
  await Promise.all(promises)
}
