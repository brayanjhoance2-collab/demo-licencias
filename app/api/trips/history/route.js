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
    const limit = parseInt(searchParams.get('limit') || '100')

    const connection = await db.getConnection()

    try {
      // Obtener viajes con información del grupo si existe
      const [viajes] = await connection.execute(
        `SELECT 
          vr.id_viaje,
          vr.monto,
          vr.km_total,
          vr.min_total,
          vr.mxn_por_km,
          vr.mxn_por_min,
          vr.mxn_por_hora,
          DATE_FORMAT(vr.fecha, '%Y-%m-%d %H:%i:%s') as fecha,
          ag.id_grupo,
          gc.nombre_grupo,
          ag.num_capturas
         FROM viajes_registrados vr
         LEFT JOIN analisis_grupos ag ON vr.id_usuario = ag.id_usuario 
           AND ABS(TIMESTAMPDIFF(SECOND, vr.fecha, ag.fecha_analisis)) < 5
         LEFT JOIN grupos_capturas gc ON ag.id_grupo = gc.id_grupo
         WHERE vr.id_usuario = ?
         ORDER BY vr.fecha DESC
         LIMIT ?`,
        [decoded.id, limit]
      )

      return NextResponse.json({
        success: true,
        data: viajes
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al obtener historial:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}