import { describe, it, expect } from 'vitest'
import { parseToIr } from './index'

// Minimal game-system XML: one top-level selectionEntry that contains two
// entryLinks -- one with flatten="true", one without -- so we can assert the
// attribute is preserved in the IR.
const GST_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gameSystem id="gs-1" name="Test" revision="1" battleScribeVersion="2.03">
  <selectionEntries>
    <selectionEntry id="se-parent" name="Parent" type="unit" hidden="false">
      <entryLinks>
        <entryLink id="link-flat" name="FlatLink" hidden="false" collective="false" import="true"
                   flatten="true" targetId="tgt-1" type="selectionEntryGroup"/>
        <entryLink id="link-plain" name="PlainLink" hidden="false" collective="false" import="true"
                   targetId="tgt-2" type="selectionEntry"/>
      </entryLinks>
    </selectionEntry>
  </selectionEntries>
</gameSystem>`

describe('parseEntryLink flatten attribute', () => {
  const ir = parseToIr({ 'test.gst': GST_XML })
  const parentEntry = ir.gameSystem.root.selectionEntries.find(e => e.id === 'se-parent')
  const flatLink = parentEntry?.entryLinks.find(l => l.id === 'link-flat')
  const plainLink = parentEntry?.entryLinks.find(l => l.id === 'link-plain')

  it('parses flatten="true" as boolean true', () => {
    expect(flatLink?.flatten).toBe(true)
  })

  it('parses absent flatten as boolean false', () => {
    expect(plainLink?.flatten).toBe(false)
  })
})
