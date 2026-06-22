import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'menu', 'TIPSY BBE NEW MENU.XLSX')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File not found at ${filePath}` }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const base64Data = fileBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      filename: 'TIPSY BBE NEW MENU.XLSX',
      base64: base64Data
    })
  } catch (error: any) {
    console.error('Error reading excel file:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
