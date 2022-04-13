
import { resolve } from 'path'
import toVFile from 'to-vfile'
import fs from 'fs'

import { getMarkdownRelease, addChanges } from '@chrisft25/chan-core'
import { createLogger, hasWarnings } from '../logger.js'
import { write } from '../vfs.js'

export const command = 'merge'
export const description = 'Merge files from versioned changelogs.'

export const builder = {}

export async function handler ({
  verbose,
  stdout,
  path = '.'
}) {
  const { report, success, info, warn, error } = createLogger({ scope: 'merge', verbose, stdout })

  try {

    const hiddenFolder = resolve(path, '.changelog')
    const versionedFiles = fs.readdirSync(hiddenFolder)
    info('Found files: ', versionedFiles)
    let changes = []

    for(const file of versionedFiles){
      const dir = resolve(hiddenFolder, file)
      const path = await toVFile.read(dir)
      const tree = getMarkdownRelease(path, { version: 'unreleased' }, stdout = false)
      tree.children.map(action=>{
        action.children[0].children[0].children.map(e=>changes.push({action: action.name.toLowerCase(), value:e.value}))
      })
      fs.unlinkSync(dir)
    }

    const file = await toVFile.read(resolve(path, 'CHANGELOG.md'))

    await addChanges(file, { changes })

    await write({ file, stdout })

    report(file)

    if (hasWarnings(file)) {
      return
    }

    success(`Entries were merged`)
  } catch (err) {
    report(err)
  }
}
