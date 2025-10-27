import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

export async function POST(request) {
  try {
    const { nombre_completo, email, telefono, password, device_id } = await request.json()

    if (!nombre_completo || !email || !telefono || !password || !device_id) {
      return NextResponse.json({
        success: false,
        error: 'Datos incompletos'
      }, { status: 400 })
    }

    const connection = await db.getConnection()

    try {
      // Verificar si el email ya existe
      const [existing] = await connection.execute(
        'SELECT id_usuario FROM usuarios WHERE email = ?',
        [email]
      )

      if (existing.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'El email ya está registrado'
        }, { status: 409 })
      }

      // Hashear contraseña
      const password_hash = await bcrypt.hash(password, 10)

      // Insertar usuario
      const [result] = await connection.execute(
        'INSERT INTO usuarios (nombre_completo, email, telefono, password_hash, activo) VALUES (?, ?, ?, ?, TRUE)',
        [nombre_completo, email, telefono, password_hash]
      )

      const id_usuario = result.insertId

      // Generar token JWT
      const token = jwt.sign(
        { id: id_usuario, email },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      return NextResponse.json({
        success: true,
        message: 'Registro exitoso',
        data: {
          token,
          usuario: {
            id_usuario,
            nombre_completo,
            email,
            telefono
          }
        }
      }, { status: 201 })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500 })
  }
}