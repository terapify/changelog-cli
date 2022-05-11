
import { resolve } from 'path'
import toVFile from 'to-vfile'
import fs from 'fs'

import { getMarkdownRelease, addChanges } from '@terapify/chan-core'
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
    if(!fs.existsSync(hiddenFolder)) return info('.changelog folder was not found')
    const versionedFiles = fs.readdirSync(hiddenFolder)
    if(!versionedFiles.length) return info('No versioned changelogs were found')
    info('Found files: ', versionedFiles)
    let changes = []

    for(const file of versionedFiles){
      const dir = resolve(hiddenFolder, file)
      const path = await toVFile.read(dir)
      const tree = getMarkdownRelease(path, { version: 'unreleased' }, stdout = false)
      tree.children.map(action=>{
        const details = action.children
        details.map(detail=>{
          detail.children.map(e=>changes.push({action: action.name.toLowerCase(), value: e.children.reduce((accum, data)=>{
            switch(data.type){
              case 'text':
                return accum+=data.value
                break
              case 'inlineCode':
                return accum+=`\`${data.value}\``
                break
              case 'link':
                return accum+=`[${data.children[0].value}](${data.url})`
                break
            }
          },'')}))
        })
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
