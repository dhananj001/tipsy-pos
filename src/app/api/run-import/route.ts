import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import vm from 'vm'

function parseMenuItemNameAndPrice(rawName: string, rawPriceStr: string) {
  const cleanName = rawName.trim().replace(/\s+/g, ' ')
  const cleanPrice = String(rawPriceStr).trim()

  if (cleanPrice.includes('/')) {
    const prices = cleanPrice.split('/').map(p => parseFloat(p.replace(/[^0-9.]/g, ''))).filter(p => !isNaN(p))
    const names = cleanName.split('/').map(n => n.trim())

    if (prices.length > 1) {
      const result = []
      const baseWords = names[0].split(' ')
      let prefix = ''
      if (baseWords.length > 1) {
        prefix = baseWords.slice(0, -1).join(' ')
      }

      for (let i = 0; i < prices.length; i++) {
        let name = names[i] || ''
        if (name === '') {
          name = `${names[0]} (Variant ${i + 1})`
        } else if (i > 0) {
          const lowerName = name.toLowerCase()
          const firstWord = baseWords[0].toLowerCase()
          // Check if name already contains the first word of the base name
          if (prefix && !lowerName.includes(firstWord)) {
            name = prefix + ' ' + name
          }
        }
        result.push({ name, price: prices[i] })
      }
      return result
    }
  }

  const price = parseFloat(cleanPrice.replace(/[^0-9.]/g, ''))
  return [{ name: cleanName, price: isNaN(price) ? 0 : price }]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const runParse = searchParams.get('parse') === 'true'

    const filePath = path.join(process.cwd(), 'menu', 'TIPSY BBE NEW MENU.XLSX')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File not found at ${filePath}` }, { status: 404 })
    }

    // 1. Fetch SheetJS
    const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    const cdnRes = await fetch(cdnUrl)
    const sheetJsCode = await cdnRes.text()

    // 2. Evaluate in VM
    const sandbox: any = { console, setTimeout, clearTimeout, Buffer, process }
    sandbox.global = sandbox
    sandbox.window = sandbox
    vm.createContext(sandbox)
    vm.runInContext(sheetJsCode, sandbox)
    const XLSX = sandbox.XLSX

    // 3. Parse file
    const fileBuffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

    if (!runParse) {
      return NextResponse.json({ success: true, sheets: workbook.SheetNames })
    }

    const categories: string[] = []
    const menuItems: any[] = []

    workbook.SheetNames.forEach((sheetName: string) => {
      // Determine default printer group based on sheet name
      let defaultPrinter: 'kitchen' | 'bar' | 'billing' = 'kitchen'
      if (sheetName.toLowerCase().includes('bar') || sheetName.toLowerCase().includes('cardboard') || sheetName.toLowerCase().includes('beverage')) {
        defaultPrinter = 'bar'
      }

      const worksheet = workbook.Sheets[sheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      let currentCategory = 'General'
      if (sheetName.toLowerCase() === 'cardboard') {
        currentCategory = 'Bar Bites'
      }

      jsonData.forEach((row: any) => {
        const keys = Object.keys(row)
        if (keys.length === 0) return

        const col0 = String(row[keys[0]] || '').trim()
        const col1 = String(row[keys[1]] || '').trim()
        const col2 = String(row[keys[2]] || '').trim()

        // 1. Check if first column is category header
        if (col0 !== '') {
          currentCategory = col0.replace(/:/g, '').trim()
          if (!categories.includes(currentCategory)) {
            categories.push(currentCategory)
          }
          return
        }

        // 2. If first column is empty, look at second and third columns
        if (col1 !== '') {
          if (col2 === '') {
            // Check if it is a description or subcategory
            if (col1.startsWith('(') && col1.endsWith(')') && menuItems.length > 0) {
              const lastItem = menuItems[menuItems.length - 1]
              lastItem.description = col1.substring(1, col1.length - 1).trim()
            } else {
              currentCategory = col1.replace(/:/g, '').trim()
              if (!categories.includes(currentCategory)) {
                categories.push(currentCategory)
              }
            }
          } else {
            // It is a menu item
            const parsed = parseMenuItemNameAndPrice(col1, col2)
            parsed.forEach(item => {
              menuItems.push({
                category: currentCategory,
                name: item.name,
                price: item.price,
                description: null,
                printer_type: defaultPrinter
              })
            })
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      categoryCount: categories.length,
      itemCount: menuItems.length,
      categories,
      menuItems: menuItems.slice(0, 50),
      totalItems: menuItems
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
