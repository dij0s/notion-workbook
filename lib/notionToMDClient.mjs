import { NotionToMarkdown } from 'notion-to-md'

export default function setupNotionToMDClient({ notionClient }) {
    const client = new NotionToMarkdown({ notionClient: notionClient })

    client.setCustomTransformer('equation', async (block) => {
        const { equation } = block
        return `$$${equation?.expression.replace(/(\r\n|\n|\r)/gm, '')}$$`
    })

    client.setCustomTransformer('paragraph', async (block) => {
        let out = ""
        block.paragraph.rich_text.forEach((subBlock) => {
            if (subBlock.type === 'equation') out += `$${subBlock.equation.expression.replace('\n', '')}$`
            else out += subBlock.plain_text
        })
        return out
    })

    client.setCustomTransformer('callout', async (block) => {
        let out = ""
        block.callout.rich_text.forEach((subBlock) => {
            if (subBlock.type === 'equation') out += `$${subBlock.equation.expression}$`
            else out += subBlock.text.content
        })
        return `> ${out.replace(/\n/g, "  \n> ")}`;
    })

    client.setCustomTransformer('numbered_list_item', async (block) => {
        let out = block.numbered_list_item.number ? `${block.numbered_list_item.number}. ` : ''
        block.numbered_list_item.rich_text.forEach((subBlock) => {
            if (subBlock.type === 'equation') out += `$${subBlock.equation.expression}$`
            else out += subBlock.text.content
        })
        return out
    })

    return client
}