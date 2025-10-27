
// ==================== 2. api/grupos/create/route.js ====================
// CREAR UN NUEVO GRUPO

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

    const { nombre_grupo } = await request.json()

    if (!nombre_grupo || nombre_grupo.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'El nombre del grupo es requerido'
      }, { status: 400, headers: corsHeaders })
    }

    const connection = await db.getConnection()

    try {
      const [result] = await connection.execute(
        `INSERT INTO grupos_capturas (id_usuario, nombre_grupo) 
         VALUES (?, ?)`,
        [decoded.id, nombre_grupo.trim()]
      )

      return NextResponse.json({
        success: true,
        message: 'Grupo creado exitosamente',
        data: {
          id_grupo: result.insertId,
          nombre_grupo: nombre_grupo.trim()
        }
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al crear grupo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}