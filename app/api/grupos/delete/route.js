
// ==================== 3. api/grupos/delete/route.js ====================
// ELIMINAR UN GRUPO (Y SUS SCREENSHOTS)

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

    const { id_grupo } = await request.json()

    if (!id_grupo) {
      return NextResponse.json({
        success: false,
        error: 'ID de grupo requerido'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      // Verificar que el grupo pertenece al usuario
      const [grupos] = await connection.execute(
        `SELECT id_grupo FROM grupos_capturas 
         WHERE id_grupo = ? AND id_usuario = ?`,
        [id_grupo, decoded.id]
      )

      if (grupos.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Grupo no encontrado'
        }, { status: 404, headers: corsHeaders })
      }

      // Marcar como inactivo (soft delete)
      await connection.execute(
        `UPDATE grupos_capturas SET activo = FALSE WHERE id_grupo = ?`,
        [id_grupo]
      )

      // También eliminar los screenshots asociados (la BD lo hace automáticamente con CASCADE)

      return NextResponse.json({
        success: true,
        message: 'Grupo eliminado exitosamente'
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al eliminar grupo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}