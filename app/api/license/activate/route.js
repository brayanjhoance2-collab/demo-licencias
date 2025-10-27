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

    const { codigo_licencia, device_id } = await request.json()

    if (!codigo_licencia || !device_id) {
      return NextResponse.json({
        success: false,
        error: 'Datos incompletos'
      }, { status: 400 })
    }

    const connection = await db.getConnection()

    try {
      // Buscar licencia
      const [licencias] = await connection.execute(
        'SELECT * FROM licencias WHERE codigo_licencia = ?',
        [codigo_licencia]
      )

      if (licencias.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Código de licencia inválido'
        }, { status: 404 })
      }

      const licencia = licencias[0]

      // Verificar si ya está usada por otro dispositivo
      if (licencia.usado && licencia.dispositivo_id && licencia.dispositivo_id !== device_id) {
        return NextResponse.json({
          success: false,
          error: 'Esta licencia está vinculada a otro dispositivo'
        }, { status: 403 })
      }

      // Calcular fechas
      const fecha_inicio = new Date()
      const fecha_vencimiento = new Date()
      fecha_vencimiento.setDate(fecha_vencimiento.getDate() + 30)

      // Actualizar licencia
      await connection.execute(
        `UPDATE licencias 
         SET id_usuario = ?, 
             dispositivo_id = ?, 
             fecha_inicio = ?, 
             fecha_vencimiento = ?, 
             activa = TRUE, 
             usado = TRUE 
         WHERE id_licencia = ?`,
        [
          decoded.id, 
          device_id, 
          fecha_inicio.toISOString().split('T')[0], 
          fecha_vencimiento.toISOString().split('T')[0],
          licencia.id_licencia
        ]
      )

      // Registrar en historial
      await connection.execute(
        'INSERT INTO historial_licencias (id_licencia, accion, notas) VALUES (?, ?, ?)',
        [licencia.id_licencia, 'activada', 'Licencia activada desde app móvil']
      )

      return NextResponse.json({
        success: true,
        message: 'Licencia activada exitosamente',
        data: {
          id_licencia: licencia.id_licencia,
          codigo_licencia: licencia.codigo_licencia,
          fecha_inicio: fecha_inicio.toISOString().split('T')[0],
          fecha_vencimiento: fecha_vencimiento.toISOString().split('T')[0],
          tipo_licencia: licencia.tipo_licencia,
          activa: true,
          dias_restantes: 30
        }
      })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al activar licencia:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500 })
  }
}