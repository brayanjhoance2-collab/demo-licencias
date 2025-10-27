import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

export async function POST(request) {
  try {
    const { email, password, device_id } = await request.json()

    if (!email || !password || !device_id) {
      return NextResponse.json({
        success: false,
        error: 'Datos incompletos'
      }, { status: 400 })
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
        }, { status: 401 })
      }

      const usuario = rows[0]

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, usuario.password_hash)

      if (!passwordMatch) {
        return NextResponse.json({
          success: false,
          error: 'Credenciales inválidas'
        }, { status: 401 })
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

      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          usuario: {
            id_usuario: usuario.id_usuario,
            nombre_completo: usuario.nombre_completo,
            email: usuario.email,
            telefono: usuario.telefono
          }
        }
      })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500 })
  }
}