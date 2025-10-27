// / ==================== 1. api/grupos/list/route.js ====================
// OBTENER TODOS LOS GRUPOS DEL USUARIO

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

    const connection = await db.getConnection()

    try {
      const [grupos] = await connection.execute(
        `SELECT 
          g.id_grupo,
          g.nombre_grupo,
          g.fecha_creacion,
          g.activo,
          COUNT(s.id_screenshot) as total_capturas
         FROM grupos_capturas g
         LEFT JOIN screenshots s ON g.id_grupo = s.id_grupo
         WHERE g.id_usuario = ? AND g.activo = TRUE
         GROUP BY g.id_grupo, g.nombre_grupo, g.fecha_creacion, g.activo
         ORDER BY g.fecha_creacion DESC`,
        [decoded.id]
      )

      return NextResponse.json({
        success: true,
        data: grupos
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al obtener grupos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}