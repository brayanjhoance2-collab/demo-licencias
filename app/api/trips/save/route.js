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

    const { id_usuario, monto, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora, fecha } = await request.json()

    const connection = await db.getConnection()

    try {
      await connection.execute(
        `INSERT INTO viajes_registrados 
         (id_usuario, monto, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_usuario, monto, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora]
      )

      return NextResponse.json({
        success: true,
        message: 'Viaje guardado correctamente'
      })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al guardar viaje:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500 })
  }
}