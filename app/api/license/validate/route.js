// api/auth/license/validate/route.js

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

    const connection = await db.getConnection()

    try {
      // Primero verificar que el usuario exista y tenga este device_id registrado
      const [usuarios] = await connection.execute(
        'SELECT device_id FROM usuarios WHERE id_usuario = ? AND activo = TRUE',
        [decoded.id]
      )

      if (usuarios.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Usuario no encontrado o inactivo'
        }, { status: 404, headers: corsHeaders })
      }

      const usuario = usuarios[0]

      // Verificar que el device_id coincida
      if (usuario.device_id !== device_id) {
        return NextResponse.json({
          success: false,
          error: 'Dispositivo no autorizado. Inicia sesión desde el dispositivo correcto.'
        }, { status: 403, headers: corsHeaders })
      }

      // Buscar licencia activa para este usuario
      // NOTA: Ahora busca por id_usuario, no por dispositivo_id
      const [licencias] = await connection.execute(
        `SELECT * FROM licencias 
         WHERE id_usuario = ? 
         AND activa = TRUE 
         ORDER BY fecha_vencimiento DESC 
         LIMIT 1`,
        [decoded.id]
      )

      if (licencias.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No tienes licencia activa'
        }, { status: 404, headers: corsHeaders })
      }

      const licencia = licencias[0]
      const hoy = new Date()
      const vencimiento = new Date(licencia.fecha_vencimiento)
      const dias_restantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      // Verificar si la licencia expiró
      if (dias_restantes < 0) {
        await connection.execute(
          'UPDATE licencias SET activa = FALSE WHERE id_licencia = ?',
          [licencia.id_licencia]
        )

        return NextResponse.json({
          success: false,
          error: 'Licencia expirada'
        }, { status: 403, headers: corsHeaders })
      }

      // Actualizar dispositivo_id en la licencia si no está seteado o es diferente
      if (licencia.dispositivo_id !== device_id) {
        await connection.execute(
          'UPDATE licencias SET dispositivo_id = ? WHERE id_licencia = ?',
          [device_id, licencia.id_licencia]
        )
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
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al validar licencia:', error)
    return NextResponse.json({
      success: false,
      error: 'Problemas en el servidor'
    }, { status: 500, headers: corsHeaders })
  }
}