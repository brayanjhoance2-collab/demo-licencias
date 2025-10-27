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

export async function DELETE(request) {
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido'
      }, { status: 401, headers: corsHeaders })
    }

    const { id_viaje } = await request.json()

    if (!id_viaje) {
      return NextResponse.json({
        success: false,
        error: 'ID de viaje requerido'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      // Verificar que el viaje pertenece al usuario
      const [viajes] = await connection.execute(
        `SELECT id_viaje FROM viajes_registrados 
         WHERE id_viaje = ? AND id_usuario = ?`,
        [id_viaje, decoded.id]
      )

      if (viajes.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Viaje no encontrado'
        }, { status: 404, headers: corsHeaders })
      }

      // Eliminar el viaje
      await connection.execute(
        `DELETE FROM viajes_registrados WHERE id_viaje = ?`,
        [id_viaje]
      )

      return NextResponse.json({
        success: true,
        message: 'Viaje eliminado exitosamente'
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al eliminar viaje:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}