import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

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
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido'
      }, { status: 401 })
    }

    const { device_id } = await request.json()

    const connection = await db.getConnection()

    try {
      const [licencias] = await connection.execute(
        `SELECT * FROM licencias 
         WHERE id_usuario = ? 
         AND dispositivo_id = ? 
         AND activa = TRUE 
         ORDER BY fecha_vencimiento DESC 
         LIMIT 1`,
        [decoded.id, device_id]
      )

      if (licencias.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No tienes licencia activa'
        }, { status: 404 })
      }

      const licencia = licencias[0]
      const hoy = new Date()
      const vencimiento = new Date(licencia.fecha_vencimiento)
      const dias_restantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      if (dias_restantes < 0) {
        await connection.execute(
          'UPDATE licencias SET activa = FALSE WHERE id_licencia = ?',
          [licencia.id_licencia]
        )

        return NextResponse.json({
          success: false,
          error: 'Licencia expirada'
        }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        data: {
          id_licencia: licencia.id_licencia,
          codigo_licencia: licencia.codigo_licencia,
          fecha_vencimiento: licencia.fecha_vencimiento,
          activa: true,
          dias_restantes
        }
      })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al validar licencia:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500 })
  }
}