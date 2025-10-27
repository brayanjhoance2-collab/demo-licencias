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
  console.log('✅ OPTIONS /trips/delete')
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

export async function POST(request) {
  try {
    console.log('═══════════════════════════')
    console.log('🗑️ DELETE TRIP REQUEST - POST')
    
    const decoded = verifyToken(request)
    if (!decoded) {
      console.log('❌ Token inválido')
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('✅ Usuario autenticado:', decoded.id)

    const body = await request.json()
    console.log('📥 Body recibido:', JSON.stringify(body))

    const id_viaje = body.id_viaje

    if (!id_viaje) {
      console.error('❌ ID de viaje no proporcionado')
      return NextResponse.json(
        { success: false, error: 'ID de viaje requerido' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`🔍 Buscando viaje ${id_viaje} del usuario ${decoded.id}`)

    const connection = await db.getConnection()

    try {
      // Verificar que el viaje pertenece al usuario
      const [viajes] = await connection.execute(
        `SELECT id_viaje FROM viajes_registrados WHERE id_viaje = ? AND id_usuario = ?`,
        [id_viaje, decoded.id]
      )

      console.log('🔎 Viajes encontrados:', viajes.length)

      if (viajes.length === 0) {
        console.error('❌ Viaje no encontrado o no pertenece al usuario')
        return NextResponse.json(
          { success: false, error: 'Viaje no encontrado' },
          { status: 404, headers: corsHeaders }
        )
      }

      // Eliminar el viaje
      const [result] = await connection.execute(
        `DELETE FROM viajes_registrados WHERE id_viaje = ?`,
        [id_viaje]
      )

      console.log('✅ Viaje eliminado, affected rows:', result.affectedRows)
      console.log('═══════════════════════════')

      return NextResponse.json(
        {
          success: true,
          message: 'Viaje eliminado exitosamente',
          data: { deleted: true, id_viaje: id_viaje }
        },
        { headers: corsHeaders }
      )

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('❌ Error al eliminar viaje:', error)
    console.log('═══════════════════════════')
    return NextResponse.json(
      { success: false, error: 'Error del servidor' },
      { status: 500, headers: corsHeaders }
    )
  }
}