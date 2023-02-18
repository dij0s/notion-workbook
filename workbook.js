import process from 'process'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
import { Client } from '@notionhq/client'
import setupNotionToMDClient from './lib/notionToMDClient.mjs'
import moment from 'moment'

dotenv.config()

if (process.argv.length != 4) {
    console.error(`Expected ${4 - process.argv.length} more argument(s)\nUsage: node workbook.js {unit} {page_type}`)
    process.exit(1)
}

(async () => {
    const notionClient = new Client({ auth: process.env.NOTION_INTEGRATION_KEY })
    const notionToMDClient = setupNotionToMDClient({ notionClient })

    const modulePage = await notionClient.search({
        query: process.argv[2].split('.')[0],
        filter: {
            value: 'page',
            property: 'object'
        }
    })

    const notesDatabases = await notionClient.search({
        query: 'Notes',
        filter: {
            value: 'database',
            property: 'object'
        }
    })
    const notesDatabase = notesDatabases.results.filter(page => page.parent.page_id === modulePage.results[0].id)[0]

    const subUnitPages = await notionClient.databases.query({
        database_id: notesDatabase.id,
        filter: {
            and: [
                {
                    property: 'Unit',
                    select: {
                        equals: process.argv[2]
                    }
                },
                {
                    property: 'Type',
                    select: {
                        equals: process.argv[3]
                    }
                }
            ]
        }
    })

    if (subUnitPages.results.length === 0) {
        console.log(`No pages in this subunit for given type '${process.argv[3]}' have been found`)
        process.exit(1)
    }

    Promise.all(subUnitPages.results.sort((page) => page.created_time).reverse().map((page) => notionClient.blocks.children.list({
        block_id: page.id
    }))).then((data) => {
        const blocksToConvert = data.map((block) => block.results.filter((b) => b.type !== 'table_of_contents')).flat(1)
        data.map((block) => block.results.filter((b) => b.type == 'numbered_list_item')).flat(1).forEach((a) => console.log(a.numbered_list_item.rich_text))
        notionToMDClient.blocksToMarkdown(blocksToConvert).then((mdBlocks) => {
            const mdString = notionToMDClient.toMarkdownString(mdBlocks)
            const filePath = `./export/${moment().format('YYYY-MM-DD')}_${process.argv[2].replace('.', '-')}_${process.argv[3].normalize("NFD").replace(/\p{Diacritic}/gu, "")}_export.md`
            fs.writeFile(filePath, mdString, (err) => {
                if (err) console.log(err)
                else console.log(`Successfully exported file at path ${filePath}`)
            })
        })
    })
})()