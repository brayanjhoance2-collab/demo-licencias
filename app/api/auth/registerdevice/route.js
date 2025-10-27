//api/auth/register-device/route.js
import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Manejar preflight
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

export async function POST(request) {
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido'
      }, { status: 401, headers: corsHeaders })
    }

    const { device_id } = await request.json()

    if (!device_id || device_id.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'device_id es requerido'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      // Verificar si el usuario ya tiene un device_id
      const [users] = await connection.execute(
        'SELECT device_id FROM usuarios WHERE id_usuario = ?',
        [decoded.id]
      )

      if (users.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Usuario no encontrado'
        }, { status: 404, headers: corsHeaders })
      }

      const usuario = users[0]

      // Si ya tiene device_id, no permitir cambio
      if (usuario.device_id && usuario.device_id.trim() !== '') {
        return NextResponse.json({
          success: false,
          error: 'Este usuario ya tiene un dispositivo registrado'
        }, { status: 403, headers: corsHeaders })
      }

      // Registrar el device_id
      await connection.execute(
        'UPDATE usuarios SET device_id = ? WHERE id_usuario = ?',
        [device_id, decoded.id]
      )

      return NextResponse.json({
        success: true,
        message: 'Dispositivo registrado exitosamente',
        data: {
          device_id
        }
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al registrar dispositivo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}