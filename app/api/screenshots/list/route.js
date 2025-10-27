
// ==================== 4. api/screenshots/list/route.js ====================
// OBTENER SCREENSHOTS DE UN GRUPO

import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders })
}

function verifyToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function GET(request) {
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido'
      }, { status: 401, headers: corsHeaders })
    }

    const { searchParams } = new URL(request.url)
    const id_grupo = parseInt(searchParams.get('id_grupo'))

    if (!id_grupo) {
      return NextResponse.json({
        success: false,
        error: 'ID de grupo requerido'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      // Verificar que el grupo pertenece al usuario
      const [grupos] = await connection.execute(
        `SELECT id_grupo FROM grupos_capturas 
         WHERE id_grupo = ? AND id_usuario = ?`,
        [id_grupo, decoded.id]
      )

      if (grupos.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Grupo no encontrado'
        }, { status: 404, headers: corsHeaders })
      }

      // Obtener screenshots (SOLO LAS RUTAS, NO LAS IMÁGENES)
      const [screenshots] = await connection.execute(
        `SELECT 
          id_screenshot,
          ruta_imagen,
          DATE_FORMAT(fecha_captura, '%Y-%m-%d %H:%i:%s') as fecha_captura,
          procesado
         FROM screenshots 
         WHERE id_grupo = ?
         ORDER BY fecha_captura DESC`,
        [id_grupo]
      )

      return NextResponse.json({
        success: true,
        data: screenshots
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al obtener screenshots:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}
