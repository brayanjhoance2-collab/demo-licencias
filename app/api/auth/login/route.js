//api/auth/login/route.js
import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import bcrypt from 'bcryptjs'
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

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email y contraseña son requeridos'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      // Buscar usuario
      const [rows] = await connection.execute(
        'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE',
        [email]
      )

      if (rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Credenciales inválidas'
        }, { status: 401, headers: corsHeaders })
      }

      const usuario = rows[0]

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, usuario.password_hash)

      if (!passwordMatch) {
        return NextResponse.json({
          success: false,
          error: 'Credenciales inválidas'
        }, { status: 401, headers: corsHeaders })
      }

      // Actualizar última sesión
      await connection.execute(
        'UPDATE usuarios SET ultima_sesion = NOW() WHERE id_usuario = ?',
        [usuario.id_usuario]
      )

      // Generar token JWT
      const token = jwt.sign(
        { 
          id: usuario.id_usuario, 
          email: usuario.email 
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      // Verificar si tiene device_id registrado
      const device_registered = usuario.device_id && usuario.device_id.trim() !== ''

      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          device_registered, // true si ya tiene device, false si no
          usuario: {
            id_usuario: usuario.id_usuario,
            nombre_completo: usuario.nombre_completo,
            email: usuario.email,
            telefono: usuario.telefono,
            device_id: usuario.device_id || null
          }
        }
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}