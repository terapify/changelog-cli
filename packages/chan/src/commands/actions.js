import toVFile from 'to-vfile'
import { resolve } from 'path'
import fs from 'fs'

import { addChanges } from '@chrisft25/chan-core'

import { createLogger } from '../logger.js'
import { openInEditor } from '../open-in-editor.js'
import { write } from '../vfs.js'

import { getBranch } from './utils/git.js'

import { handler as createChangelog } from './init.js'

const actions = [
  { command: 'added', description: 'Added for new features' },
  { command: 'changed', description: 'Changed for changes in existing functionality' },
  { command: 'deprecated', description: 'Deprecated for soon-to-be removed features' },
  { command: 'removed', description: 'Removed for now removed features' },
  { command: 'fixed', description: 'Fixed for any bug fixes' },
  { command: 'security', description: 'Security in case of vulnerabilities' }
]

const builder = {
  path: {
    alias: 'p',
    describe: 'Path of the CHANGELOG.md',
    type: 'string',
    default: '.'
  },
  group: {
    alias: 'g',
    describe: 'Prefix change with [<group>]. This allows to group changes on release time.',
    type: 'string'
  },
  versioning: {
    alias: 'v',
    describe: 'Boolean to set if entries should be versioned according to the branch',
    type: 'boolean',
    default: false
  }
}

const createHandler = action => async ({ message, path, group, verbose, versioning, stdout }) => {
  const { report, success, info } = createLogger({ scope: action, verbose, stdout })

  try {
    let fileName = 'CHANGELOG'

    if(versioning){
      path = resolve(path, '.changelog')
      fileName = (await getBranch()).replace(/\//g, '-')
      if(!fs.existsSync(path)) fs.mkdirSync(path)
      if(!fs.existsSync(resolve(path, `${fileName}.md`))) await createChangelog({dir: path, fileName})
    }

    const file = await toVFile.read(resolve(path, `${fileName}.md`))

    if (!message) {
      message = await openInEditor()

      if (!message || message.length === 0) {
        return info('Nothing to change.')
      }
    }

    await addChanges(file, { changes: [{ action, group, value: message }] })

    await write({ file, stdout })

    report(file)
  } catch (err) {
    return report(err)
  }

  success('Added new changes on your changelog.')
}

export const actionCommands = [
  ...actions.map(({ command, description }) => ({
    command: `${command} [message]`,
    description,
    builder,
    handler: createHandler(command)
  }))
]
